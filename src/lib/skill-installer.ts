// SPDX-License-Identifier: Apache-2.0

/**
 * Skill Installer — install skills from GitHub repos via skills.sh or direct clone.
 *
 * Secure install flow (preferred):
 * 1. Parse source (owner/repo, full URL, local path)
 * 2. Fetch skill list from skills.sh publisher/repo page
 * 3. For each skill: fetch skills.sh page → check audit results (gen, socket, snyk)
 * 4. Block skills with "fail" audit status
 * 5. Scan skill content for prompt injection patterns
 * 6. Write verified content to ~/.claude/skills/
 *
 * Fallback (raw GitHub clone):
 * 1. Shallow clone with --depth 1
 * 2. Discover SKILL.md files
 * 3. Scan each for prompt injection
 * 4. Copy verified skills to install dir
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir, homedir } from "os";
import { join, resolve, basename, relative, isAbsolute } from "path";
import { readdir, readFile, writeFile, mkdir, cp, rm, stat, realpath, lstat } from "fs/promises";
import matter from "gray-matter";
import { fetchPublisherSkills, fetchSkillPage, type PublisherSkill } from "./skills-sh/client.js";
import { auditIsBlocked, auditIsUnknown, auditIsWarn } from "./security-gate.js";
import { scanForPromptInjection } from "./security-scanner.js";
import type { AuditResult } from "./graph/schema.js";

const exec = promisify(execFile);

// ── Types ──────────────────────────────────────────

export interface ParsedSource {
  repoUrl: string;
  ref?: string;       // branch/tag
  subpath?: string;   // path within repo
  owner: string;
  repo: string;
}

export interface DiscoveredSkill {
  name: string;
  description: string;
  skillDir: string;   // directory containing SKILL.md
  skillFile: string;  // path to SKILL.md
}

export interface InstallResult {
  success: boolean;
  installed: string[];
  errors: string[];
  warnings: string[];
  blocked: string[];
}

export interface InstallOptions {
  selectSkills?: string[];
  /** Explicit opt-in to install skills with missing, incomplete, or warning audits. */
  allowUnaudited?: boolean;
}

// ── Source Parsing ──────────────────────────────────

/**
 * Parse a skill source string into a structured format.
 * Supports: owner/repo, github:owner/repo, https://github.com/owner/repo
 */
export function parseSource(source: string): ParsedSource | null {
  if (/[\\\x00-\x1f\x7f]/.test(source) || source.split("/").some((segment) => segment === ".." || segment === ".")) return null;
  // Strip trailing slash
  source = source.replace(/\/+$/, "");

  // Full GitHub URL
  const urlMatch = source.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+)(?:\/(.+))?)?$/);
  if (urlMatch) {
    return {
      repoUrl: `https://github.com/${urlMatch[1]}/${urlMatch[2]}.git`,
      ref: urlMatch[3],
      subpath: urlMatch[4],
      owner: urlMatch[1],
      repo: urlMatch[2],
    };
  }

  // github: prefix
  const prefixMatch = source.match(/^github:([^/]+)\/([^/]+?)(?:\/(.+))?$/);
  if (prefixMatch) {
    return {
      repoUrl: `https://github.com/${prefixMatch[1]}/${prefixMatch[2]}.git`,
      subpath: prefixMatch[3],
      owner: prefixMatch[1],
      repo: prefixMatch[2],
    };
  }

  // owner/repo shorthand (with optional subpath)
  const shortMatch = source.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\/(.+))?$/);
  if (shortMatch) {
    return {
      repoUrl: `https://github.com/${shortMatch[1]}/${shortMatch[2]}.git`,
      subpath: shortMatch[3],
      owner: shortMatch[1],
      repo: shortMatch[2],
    };
  }

  return null;
}

// ── Git Operations ─────────────────────────────────

/**
 * Shallow clone a repo to a temp directory.
 */
async function cloneRepo(repoUrl: string, ref?: string): Promise<string> {
  const tmpDir = join(tmpdir(), `superskill-clone-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });

  const args = ["clone", "--depth", "1"];
  if (ref) args.push("--branch", ref);
  args.push(repoUrl, tmpDir);

  try {
    await exec("git", args, { timeout: 60_000 });
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    const msg = (err as Error).message;
    if (msg.includes("timeout")) throw new Error("Clone timed out after 60s");
    if (msg.includes("Authentication")) throw new Error("Authentication required — set GITHUB_TOKEN or use a public repo");
    throw new Error(`Clone failed: ${msg}`);
  }

  return tmpDir;
}

// ── Skill Discovery ────────────────────────────────

/** Priority directories to search for SKILL.md files */
const SKILL_SEARCH_DIRS = [
  ".",
  "skills",
  ".claude/skills",
  ".agents/skills",
  ".cursor/skills",
];

/**
 * Find all SKILL.md files in a cloned repo.
 */
async function discoverSkills(repoDir: string, subpath?: string): Promise<DiscoveredSkill[]> {
  const searchRoot = subpath ? join(repoDir, subpath) : repoDir;
  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();
  const realRepo = await realpath(repoDir);

  // Check priority directories first
  for (const dir of SKILL_SEARCH_DIRS) {
    const fullDir = resolve(searchRoot, dir);
    let realDir: string;
    try {
      realDir = await realpath(fullDir);
      const rel = relative(realRepo, realDir);
      if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) continue;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      continue;
    }
    await findSkillsInDir(realDir, skills, seen, 2);
  }

  return skills;
}

async function findSkillsInDir(
  dir: string,
  results: DiscoveredSkill[],
  seen: Set<string>,
  maxDepth: number,
  depth = 0,
): Promise<void> {
  if (depth > maxDepth) return;

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // Check for SKILL.md in this directory
    if (entries.some((e) => e.name === "SKILL.md" && e.isFile())) {
      const skillFile = join(dir, "SKILL.md");
      if (!seen.has(skillFile)) {
        const content = await readFile(skillFile, "utf-8");
        const { data } = matter(content);
        if (typeof data.name === "string" && typeof data.description === "string") {
          results.push({
            name: data.name,
            description: data.description,
            skillDir: dir,
            skillFile,
          });
          seen.add(skillFile);
        }
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
      if (["node_modules", "dist", "build", ".git", "__pycache__"].includes(entry.name)) continue;
      await findSkillsInDir(join(dir, entry.name), results, seen, maxDepth, depth + 1);
    }
  } catch {
    // Directory doesn't exist
  }
}

// ── Installation ───────────────────────────────────

/**
 * Get the default skill install directory for the current tool.
 */
export function getInstallDir(): string {
  return resolve(homedir(), ".claude", "skills");
}

// Allow tests to override
let _installDir: string | null = null;
export function _setInstallDir(dir: string): void { _installDir = dir; }
export function _resetInstallDir(): void { _installDir = null; }

const SKILL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const UNAUDITED_MARKER = ".unaudited-superskill";
const MAX_SCANNED_FILES = 200;
const MAX_SCANNED_FILE_BYTES = 1024 * 1024;
const SKIP_SCAN_DIRS = new Set(["node_modules", "__pycache__"]);

export function isValidSkillName(name: string): boolean {
  if (name === "." || name === "..") return false;
  return SKILL_NAME_PATTERN.test(name);
}

/**
 * Resolve a skill name to an absolute directory strictly inside the install dir.
 * Returns null when the name is invalid or would escape the install directory.
 */
function resolveSkillDir(installDir: string, name: string): string | null {
  if (!isValidSkillName(name)) return null;
  const base = resolve(installDir);
  const target = resolve(base, name);
  const rel = relative(base, target);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return null;
  return target;
}

async function writeUnauditedMarker(
  installDir: string,
  name: string,
  details: { source: string; reason: string; audits?: AuditResult },
): Promise<void> {
  const dir = resolveSkillDir(installDir, name);
  if (!dir) return;
  await assertNoDestinationSymlinks(dir);
  const marker = {
    unaudited: true,
    source: details.source,
    reason: details.reason,
    ...(details.audits ? { audits: details.audits } : {}),
    installedAt: new Date().toISOString(),
  };
  await writeFile(join(dir, UNAUDITED_MARKER), JSON.stringify(marker, null, 2), "utf-8");
}

interface SkillDirScan {
  blockedReason?: string;
  warnings: string[];
  scanned: number;
  skipped: number;
  truncated: boolean;
}

/**
 * Scan every markdown file in a skill directory before it is copied.
 * Bounded: files over 1 MB are skipped and the total scan is capped.
 */
async function scanSkillDirectory(skillDir: string): Promise<SkillDirScan> {
  const result: SkillDirScan = { warnings: [], scanned: 0, skipped: 0, truncated: false };
  const queue: string[] = [skillDir];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`[skill-installer] failed to read ${dir} for scanning: ${(err as Error).message}`);
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_SCAN_DIRS.has(entry.name)) continue;
        queue.push(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      if (result.scanned >= MAX_SCANNED_FILES) {
        result.truncated = true;
        return result;
      }
      result.scanned++;
      try {
        const info = await stat(full);
        if (info.size > MAX_SCANNED_FILE_BYTES) {
          result.skipped++;
          continue;
        }
        const content = await readFile(full, "utf-8");
        const scan = scanForPromptInjection(content);
        if (scan.blocked) {
          result.blockedReason = `${relative(skillDir, full)}: ${scan.reason}`;
          return result;
        }
        for (const warning of scan.warnings) {
          result.warnings.push(`${relative(skillDir, full)}: ${warning}`);
        }
      } catch (err) {
        console.error(`[skill-installer] failed to scan ${full}: ${(err as Error).message}`);
      }
    }
  }
  return result;
}

async function assertNoDestinationSymlinks(path: string): Promise<void> {
  let info;
  try {
    info = await lstat(path);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  if (info.isSymbolicLink()) throw new Error(`Symlinked skill destination rejected: ${path}`);
  if (info.isDirectory()) {
    for (const name of await readdir(path)) await assertNoDestinationSymlinks(join(path, name));
  }
}

/**
 * Install skills from skills.sh — the secure, preferred path.
 *
 * Flow:
 * 1. Fetch publisher/repo page from skills.sh to discover all available skills
 * 2. For each skill: fetch skill page → extract audit results + content
 * 3. Block skills with "fail" audit status
 * 4. Warn on "warn" audit status
 * 5. Scan content for prompt injection
 * 6. Write verified content to install dir
 */
async function installFromSkillsSh(
  owner: string,
  repo: string,
  options?: InstallOptions,
): Promise<InstallResult> {
  const installDir = _installDir ?? getInstallDir();
  await mkdir(installDir, { recursive: true });

  const warnings: string[] = [];
  const errors: string[] = [];
  const blocked: string[] = [];
  const installed: string[] = [];

  // Step 1: Discover skills from skills.sh publisher page
  const publisherSkills = await fetchPublisherSkills(owner, repo);
  if (publisherSkills.length === 0) {
    return {
      success: false,
      installed: [],
      errors: [`No skills found on skills.sh for ${owner}/${repo}. Trying GitHub fallback...`],
      warnings: [],
      blocked: [],
    };
  }

  // Filter if selective install requested
  const toInstall = options?.selectSkills
    ? publisherSkills.filter((s) => options.selectSkills!.includes(s.skill))
    : publisherSkills;

  if (toInstall.length === 0) {
    const available = publisherSkills.map((s) => s.skill).join(", ");
    return {
      success: false,
      installed: [],
      errors: [`None of the requested skills found on skills.sh. Available: ${available}`],
      warnings: [],
      blocked: [],
    };
  }

  // Step 2-6: Process each skill with audit + security scanning
  for (const skillRef of toInstall) {
    try {
      const pageData = await fetchSkillPage(skillRef.owner, skillRef.repo, skillRef.skill);
      if (!pageData) {
        errors.push(`${skillRef.skill}: Could not fetch skill page from skills.sh`);
        continue;
      }

      // Step 3: Fail-closed audit gate — "fail" always blocks; unknown/warn need an explicit opt-in
      const audits = pageData.audits;
      const auditDetail = `gen=${audits.gen}, socket=${audits.socket}, snyk=${audits.snyk}`;
      const hasFail = [audits.gen, audits.socket, audits.snyk].some((status) => status === "fail");
      const unknownAudit = auditIsUnknown(audits);
      const allPass = !auditIsBlocked(audits) && !auditIsWarn(audits);
      if (hasFail) {
        blocked.push(`${skillRef.skill}: BLOCKED — audit failed (${auditDetail})`);
        continue;
      }
      if (unknownAudit && !options?.allowUnaudited) {
        blocked.push(`${skillRef.skill}: BLOCKED — audit status unknown (fail-closed) (${auditDetail}); re-run with allowUnaudited/--allow-unaudited to override`);
        continue;
      }
      if (auditIsWarn(audits) && !options?.allowUnaudited) {
        blocked.push(`${skillRef.skill}: BLOCKED — audits not all pass (${auditDetail}); re-run with allowUnaudited/--allow-unaudited to override`);
        continue;
      }

      // Step 4: Surface warn/unknown statuses that were explicitly allowed
      if (auditIsWarn(audits)) {
        warnings.push(`${skillRef.skill}: audit warning (${auditDetail})`);
      }
      if (unknownAudit) {
        warnings.push(`${skillRef.skill}: audit status unknown — installing unaudited via allowUnaudited (${auditDetail})`);
      }

      // Step 5: Scan for prompt injection
      const content = pageData.skillMd;
      if (!content) {
        errors.push(`${skillRef.skill}: No SKILL.md content found on skills.sh page`);
        continue;
      }

      const scanResult = scanForPromptInjection(content);
      if (scanResult.blocked) {
        blocked.push(`${skillRef.skill}: BLOCKED — ${scanResult.reason}`);
        continue;
      }
      for (const w of scanResult.warnings) {
        warnings.push(`${skillRef.skill}: ${w}`);
      }

      // Step 6: Write verified content
      const destDir = resolveSkillDir(installDir, skillRef.skill);
      if (!destDir) {
        errors.push(`${skillRef.skill}: Invalid skill name`);
        continue;
      }
      await assertNoDestinationSymlinks(destDir);
      await mkdir(destDir, { recursive: true });

      const skillMd = `---\nname: ${skillRef.skill}\ndescription: Skill from ${owner}/${repo}\nsource: skills.sh\ninstalls: ${pageData.installs}\nstars: ${pageData.stars}\naudits:\n  gen: ${pageData.audits.gen}\n  socket: ${pageData.audits.socket}\n  snyk: ${pageData.audits.snyk}\n---\n\n${content}`;

      await writeFile(join(destDir, "SKILL.md"), skillMd, "utf-8");
      if (!allPass) {
        await writeUnauditedMarker(installDir, skillRef.skill, {
          source: "skills.sh",
          reason: `audits not all pass (${auditDetail}); installed with allowUnaudited`,
          audits,
        });
      }
      installed.push(skillRef.skill);
    } catch (err) {
      errors.push(`${skillRef.skill}: ${(err as Error).message}`);
    }
  }

  return {
    success: installed.length > 0,
    installed,
    errors,
    warnings,
    blocked,
  };
}

/**
 * Install skills via raw GitHub clone — the fallback path.
 *
 * Flow:
 * 1. Shallow clone
 * 2. Discover SKILL.md files
 * 3. Scan each for prompt injection
 * 4. Copy verified skills to install dir
 */
async function installFromGitHub(
  parsed: ParsedSource,
  options?: InstallOptions,
): Promise<InstallResult> {
  const installDir = _installDir ?? getInstallDir();
  await mkdir(installDir, { recursive: true });

  let tmpDir: string | null = null;
  const warnings: string[] = [];
  const blocked: string[] = [];

  try {
    // Clone
    tmpDir = await cloneRepo(parsed.repoUrl, parsed.ref);

    // Discover
    const skills = await discoverSkills(tmpDir, parsed.subpath);
    if (skills.length === 0) {
      return { success: false, installed: [], errors: [`No SKILL.md files found in ${parsed.owner}/${parsed.repo}`], warnings: [], blocked: [] };
    }

    // Filter if selective install requested
    const toInstall = options?.selectSkills
      ? skills.filter((s) => options.selectSkills!.includes(s.name))
      : skills;

    if (toInstall.length === 0) {
      const available = skills.map((s) => s.name).join(", ");
      return { success: false, installed: [], errors: [`None of the requested skills found. Available: ${available}`], warnings: [], blocked: [] };
    }

    // Security scan + copy each skill
    const installed: string[] = [];
    const errors: string[] = [];

    for (const skill of toInstall) {
      try {
        // Scan every markdown file before copying the whole directory
        const scan = await scanSkillDirectory(skill.skillDir);
        if (scan.blockedReason) {
          blocked.push(`${skill.name}: BLOCKED — ${scan.blockedReason}`);
          continue;
        }
        for (const w of scan.warnings) {
          warnings.push(`${skill.name}: ${w}`);
        }
        if (scan.truncated) {
          warnings.push(`${skill.name}: scan stopped after ${MAX_SCANNED_FILES} markdown files`);
        }
        if (scan.skipped > 0) {
          warnings.push(`${skill.name}: ${scan.skipped} markdown file(s) over 1 MB were not scanned`);
        }

        const destDir = resolveSkillDir(installDir, skill.name);
        if (!destDir) {
          errors.push(`${skill.name}: Invalid skill name`);
          continue;
        }
        await assertNoDestinationSymlinks(destDir);
        await mkdir(destDir, { recursive: true });
        await cp(skill.skillDir, destDir, {
          recursive: true,
          filter: async (src) => {
            const name = basename(src);
            return !name.startsWith(".git") && name !== "node_modules" && name !== "__pycache__" && !(await lstat(src)).isSymbolicLink();
          },
        });
        installed.push(skill.name);
      } catch (err) {
        errors.push(`${skill.name}: ${(err as Error).message}`);
      }
    }

    return { success: installed.length > 0, installed, errors, warnings, blocked };
  } finally {
    // Clean up temp directory
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/**
 * Install skills from a source (owner/repo, URL, etc.).
 *
 * Primary path: skills.sh (with audit + security scanning)
 * Fallback: raw GitHub clone (with security scanning)
 */
export async function installSkills(
  source: string,
  options?: InstallOptions,
): Promise<InstallResult> {
  const parsed = parseSource(source);
  if (!parsed) {
    return {
      success: false,
      installed: [],
      errors: [`Invalid source: "${source}". Use owner/repo or a GitHub URL.`],
      warnings: [],
      blocked: [],
    };
  }

  const installDir = _installDir ?? getInstallDir();

  // Try skills.sh first (secure path with audit results)
  let shResult: InstallResult;
  let fetchFailed = false;
  try {
    shResult = await installFromSkillsSh(parsed.owner, parsed.repo, options);
  } catch (err) {
    fetchFailed = true;
    shResult = {
      success: false,
      installed: [],
      errors: [`skills.sh unreachable: ${(err as Error).message}`],
      warnings: [],
      blocked: [],
    };
  }

  // Audited installs or explicit blocks always win — never fall back for these
  if (shResult.installed.length > 0 || shResult.blocked.length > 0) {
    return shResult;
  }

  if (!fetchFailed) {
    console.error(`[skill-installer] skills.sh returned no results for ${parsed.owner}/${parsed.repo}; refusing unaudited GitHub fallback`);
    return {
      success: false,
      installed: [],
      errors: [
        ...shResult.errors,
        `No installable skills found via skills.sh for ${parsed.owner}/${parsed.repo}. Refusing unaudited GitHub fallback.`,
      ],
      warnings: [
        ...shResult.warnings,
        "GitHub fallback skipped: skills.sh returned empty results (audit status cannot be verified).",
      ],
      blocked: shResult.blocked,
    };
  }

  if (!options?.allowUnaudited) {
    console.error(`[skill-installer] skills.sh unreachable for ${parsed.owner}/${parsed.repo}; refusing the unaudited GitHub fallback (allowUnaudited not set)`);
    return {
      success: false,
      installed: [],
      errors: [
        ...shResult.errors,
        `skills.sh unreachable for ${parsed.owner}/${parsed.repo}. Refusing the unaudited GitHub clone without allowUnaudited (--allow-unaudited).`,
      ],
      warnings: [
        ...shResult.warnings,
        "GitHub fallback skipped: no skills.sh audit results are available, so the install would be unaudited.",
      ],
      blocked: shResult.blocked,
    };
  }

  // Only a thrown/fetch-failed skills.sh attempt may use the unaudited fallback
  console.error(`[skill-installer] WARNING: skills.sh unreachable for ${parsed.owner}/${parsed.repo}; installing via unaudited GitHub clone (allowUnaudited)`);
  const fallback = await installFromGitHub(parsed, options);
  if (fallback.installed.length > 0) {
    for (const name of fallback.installed) {
      await writeUnauditedMarker(installDir, name, {
        source: "github-fallback",
        reason: "skills.sh was unreachable; no audit results available",
      });
    }
    fallback.warnings.push(
      `Installed without skills.sh audit. Marked with ${UNAUDITED_MARKER}; run audits before use.`
    );
  }
  return fallback;
}

/**
 * Remove an installed skill by name.
 */
export async function removeSkill(name: string): Promise<{ success: boolean; error?: string }> {
  const installDir = _installDir ?? getInstallDir();
  const skillDir = resolveSkillDir(installDir, name);

  if (!skillDir) {
    return { success: false, error: `Invalid skill name: "${name}"` };
  }

  try {
    await stat(skillDir);
  } catch {
    return { success: false, error: `Skill "${name}" not found at ${skillDir}` };
  }

  try {
    await rm(skillDir, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to remove: ${(err as Error).message}` };
  }
}

/**
 * List installed skills with basic metadata.
 */
export interface InstalledSkillInfo {
  name: string;
  description: string;
  dir: string;
  source?: string;
  audits?: AuditResult;
}

function frontmatterAudits(data: Record<string, unknown>): AuditResult | undefined {
  const raw = data.audits;
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const pick = (value: unknown): "pass" | "warn" | "fail" | "unknown" =>
    value === "pass" || value === "warn" || value === "fail" || value === "unknown" ? value : "unknown";
  return { gen: pick(record.gen), socket: pick(record.socket), snyk: pick(record.snyk) };
}

export async function listInstalledSkills(): Promise<InstalledSkillInfo[]> {
  const installDir = _installDir ?? getInstallDir();
  const skills: InstalledSkillInfo[] = [];

  try {
    const entries = await readdir(installDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "learned") continue;

      // Find SKILL.md — could be at root or nested
      const dir = resolveSkillDir(installDir, entry.name);
      if (!dir) continue;
      const candidates = [
        join(dir, "SKILL.md"),
        join(dir, "skills", entry.name, "SKILL.md"),
      ];

      for (const candidate of candidates) {
        try {
          const content = await readFile(candidate, "utf-8");
          const { data } = matter(content);
          if (typeof data.name === "string") {
            const audits = frontmatterAudits(data);
            skills.push({
              name: data.name,
              description: typeof data.description === "string" ? data.description : "",
              dir,
              ...(typeof data.source === "string" ? { source: data.source } : {}),
              ...(audits ? { audits } : {}),
            });
            break;
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Install dir doesn't exist
  }

  return skills;
}
