// SPDX-License-Identifier: AGPL-3.0-or-later

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
import { join, resolve, basename } from "path";
import { readdir, readFile, writeFile, mkdir, cp, rm, stat } from "fs/promises";
import matter from "gray-matter";
import { fetchPublisherSkills, fetchSkillPage, type PublisherSkill } from "./skills-sh/client.js";
import { auditIsBlocked, auditIsWarn } from "./security-gate.js";
import { scanForPromptInjection } from "./security-scanner.js";

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

// ── Source Parsing ──────────────────────────────────

/**
 * Parse a skill source string into a structured format.
 * Supports: owner/repo, github:owner/repo, https://github.com/owner/repo
 */
export function parseSource(source: string): ParsedSource | null {
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

  // Check priority directories first
  for (const dir of SKILL_SEARCH_DIRS) {
    const fullDir = resolve(searchRoot, dir);
    await findSkillsInDir(fullDir, skills, seen, 2);
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
    if (entries.some((e) => e.name === "SKILL.md" && !e.isDirectory())) {
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
  options?: { selectSkills?: string[] },
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

      // Step 3: Check audit results — block on "fail"
      if (auditIsBlocked(pageData.audits)) {
        blocked.push(`${skillRef.skill}: BLOCKED — audit failed (gen=${pageData.audits.gen}, socket=${pageData.audits.socket}, snyk=${pageData.audits.snyk})`);
        continue;
      }

      // Step 4: Warn on "warn" audit status
      if (auditIsWarn(pageData.audits)) {
        warnings.push(`${skillRef.skill}: audit warning (gen=${pageData.audits.gen}, socket=${pageData.audits.socket}, snyk=${pageData.audits.snyk})`);
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
      const destDir = join(installDir, skillRef.skill);
      await mkdir(destDir, { recursive: true });

      const skillMd = `---\nname: ${skillRef.skill}\ndescription: Skill from ${owner}/${repo}\nsource: skills.sh\ninstalls: ${pageData.installs}\nstars: ${pageData.stars}\naudits:\n  gen: ${pageData.audits.gen}\n  socket: ${pageData.audits.socket}\n  snyk: ${pageData.audits.snyk}\n---\n\n${content}`;

      await writeFile(join(destDir, "SKILL.md"), skillMd, "utf-8");
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
  options?: { selectSkills?: string[] },
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
        // Read and scan the SKILL.md content
        const content = await readFile(skill.skillFile, "utf-8");
        const scanResult = scanForPromptInjection(content);
        if (scanResult.blocked) {
          blocked.push(`${skill.name}: BLOCKED — ${scanResult.reason}`);
          continue;
        }
        for (const w of scanResult.warnings) {
          warnings.push(`${skill.name}: ${w}`);
        }

        const destDir = join(installDir, skill.name);
        await mkdir(destDir, { recursive: true });
        await cp(skill.skillDir, destDir, {
          recursive: true,
          filter: (src) => {
            const name = basename(src);
            return !name.startsWith(".git") && name !== "node_modules" && name !== "__pycache__";
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
  options?: { selectSkills?: string[] },
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

  // Try skills.sh first (secure path with audit results)
  const shResult = await installFromSkillsSh(parsed.owner, parsed.repo, options);

  // If skills.sh found and installed skills, return those results
  if (shResult.installed.length > 0 || shResult.blocked.length > 0) {
    return shResult;
  }

  // Fallback to GitHub clone
  console.error(`[skill-installer] skills.sh returned no results, falling back to GitHub clone for ${parsed.owner}/${parsed.repo}`);
  return installFromGitHub(parsed, options);
}

/**
 * Remove an installed skill by name.
 */
export async function removeSkill(name: string): Promise<{ success: boolean; error?: string }> {
  const installDir = _installDir ?? getInstallDir();
  const skillDir = join(installDir, name);

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
export async function listInstalledSkills(): Promise<Array<{ name: string; description: string; dir: string }>> {
  const installDir = _installDir ?? getInstallDir();
  const skills: Array<{ name: string; description: string; dir: string }> = [];

  try {
    const entries = await readdir(installDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "learned") continue;

      // Find SKILL.md — could be at root or nested
      const dir = join(installDir, entry.name);
      const candidates = [
        join(dir, "SKILL.md"),
        join(dir, "skills", entry.name, "SKILL.md"),
      ];

      for (const candidate of candidates) {
        try {
          const content = await readFile(candidate, "utf-8");
          const { data } = matter(content);
          if (typeof data.name === "string") {
            skills.push({
              name: data.name,
              description: typeof data.description === "string" ? data.description : "",
              dir,
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
