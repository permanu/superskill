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
import { createHash } from "crypto";
import { tmpdir, homedir } from "os";
import { join, resolve, relative, isAbsolute, extname, sep } from "path";
import { readdir, writeFile, mkdir, mkdtemp, chmod, opendir, cp, rm, stat, realpath, lstat, rename } from "fs/promises";
import matter from "./markdown-matter.js";
import { fetchPublisherSkills, fetchSkillPage, type PublisherSkill } from "./skills-sh/client.js";
import { auditIsBlocked, auditIsUnknown, auditIsWarn } from "./security-gate.js";
import { PROMPT_SCAN_NOTICE, scanForPromptInjection } from "./security-scanner.js";
import { MAX_SKILL_FILE_BYTES, readBoundedSkillFile } from "./catalog.js";
import { assertNativeSkillMetadata } from "./native-skill.js";
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
  metadata: Record<string, unknown>;
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
    return parsedGitHubSource(urlMatch[1], urlMatch[2], urlMatch[3], urlMatch[4]);
  }

  // github: prefix
  const prefixMatch = source.match(/^github:([^/]+)\/([^/]+?)(?:\/(.+))?$/);
  if (prefixMatch) {
    return parsedGitHubSource(prefixMatch[1], prefixMatch[2], undefined, prefixMatch[3]);
  }

  // owner/repo shorthand (with optional subpath)
  const shortMatch = source.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\/(.+))?$/);
  if (shortMatch) {
    return parsedGitHubSource(shortMatch[1], shortMatch[2], undefined, shortMatch[3]);
  }

  return null;
}

function parsedGitHubSource(owner: string, repo: string, ref?: string, subpath?: string): ParsedSource | null {
  const valid = (part: string): boolean => /^[A-Za-z0-9_.-]{1,128}$/.test(part) && part !== "." && part !== ".." && !part.startsWith("-");
  const validRef = ref === undefined || (/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(ref) && !ref.includes("..") && !ref.endsWith(".") && !ref.endsWith(".lock"));
  if (![owner, repo, ...(subpath ? subpath.split("/") : [])].every(valid) || !validRef) return null;
  return { repoUrl: `https://github.com/${owner}/${repo}.git`, owner, repo, ref, subpath };
}

// ── Git Operations ─────────────────────────────────

/**
 * Shallow clone a repo to a temp directory.
 */
async function cloneRepo(repoUrl: string, ref?: string): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "superskill-clone-"));

  const args = ["clone", "--depth", "1"];
  const commitRef = ref !== undefined && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(ref);
  if (ref && !commitRef) args.push("--branch", ref);
  args.push("--", repoUrl, tmpDir);

  try {
    await chmod(tmpDir, 0o700);
    await exec("git", args, { timeout: 60_000 });
    if (commitRef) {
      await exec("git", ["-C", tmpDir, "fetch", "--depth=1", "origin", ref], { timeout: 60_000 });
      await exec("git", ["-C", tmpDir, "checkout", "--detach", "FETCH_HEAD"], { timeout: 60_000 });
    }
  } catch (err) {
    await cleanupClone(tmpDir);
    const msg = (err as Error).message;
    if (msg.includes("timeout")) throw new Error("Clone timed out after 60s");
    if (msg.includes("Authentication")) throw new Error("Authentication required — set GITHUB_TOKEN or use a public repo");
    throw new Error(`Clone failed: ${msg}`);
  }

  return tmpDir;
}

async function resolveGitCommit(repoDir: string): Promise<string> {
  const { stdout } = await exec("git", ["-C", repoDir, "rev-parse", "--verify", "HEAD^{commit}"], { timeout: 15_000 });
  const commit = stdout.trim().toLowerCase();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) throw new Error("Git checkout did not resolve to a full immutable commit hash");
  return commit;
}

async function cleanupClone(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch (error) {
    console.error(`[skill-installer] failed to clean clone ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  const budget = { entries: 0, bytes: 0 };
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
    await findSkillsInDir(realDir, skills, seen, budget, 2);
  }

  return skills;
}

async function findSkillsInDir(
  dir: string,
  results: DiscoveredSkill[],
  seen: Set<string>,
  budget: { entries: number; bytes: number },
  maxDepth: number,
  depth = 0,
): Promise<void> {
  if (depth > maxDepth) return;

  try {
    const entries = await opendir(dir);
    for await (const entry of entries) {
      if (++budget.entries > 10_000) throw new Error("Skill discovery entry limit exceeded");
      if (entry.name === "SKILL.md" && entry.isFile()) {
        const skillFile = join(dir, "SKILL.md");
        if (!seen.has(skillFile)) {
          if (results.length >= MAX_SCANNED_FILES || budget.bytes >= MAX_SCANNED_TOTAL_BYTES) throw new Error("Skill discovery size or skill limit exceeded");
          const { bytes } = await readBoundedSkillFile(skillFile, [await realpath(dir)], Math.min(MAX_SKILL_FILE_BYTES, MAX_SCANNED_TOTAL_BYTES - budget.bytes));
          budget.bytes += bytes.length;
          const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          const { data } = matter(content);
          if (typeof data.name === "string" && typeof data.description === "string") {
            results.push({
              name: data.name,
              description: data.description,
              skillDir: dir,
              skillFile,
              metadata: data,
            });
            seen.add(skillFile);
          }
        }
      }
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
      if (["node_modules", "dist", "build", ".git", "__pycache__"].includes(entry.name)) continue;
      await findSkillsInDir(join(dir, entry.name), results, seen, budget, maxDepth, depth + 1);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      console.error(`[skill-installer] failed to discover skills in ${dir}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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

const SKILL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const UNAUDITED_MARKER = ".unaudited-superskill";
const PROVENANCE_FILE = ".superskill-provenance.json";
const MAX_SCANNED_FILES = 200;
const MAX_SCANNED_TOTAL_BYTES = 16 * 1024 * 1024;

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

function assertDefaultClaudeMetadata(installDir: string, metadata: Record<string, unknown>): void {
  if (resolve(installDir) === getInstallDir()) assertNativeSkillMetadata(metadata, "anthropic");
}

async function writeReservedJson(skillDir: string, name: string, value: Record<string, unknown>): Promise<void> {
  const path = join(skillDir, name);
  try {
    await lstat(path);
    throw new Error(`Skill bundle already contains reserved metadata path: ${name}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await writeFile(path, JSON.stringify(value, null, 2), { encoding: "utf-8", flag: "wx", mode: 0o600 });
}

async function writeUnauditedMarker(
  skillDir: string,
  details: { source: string; reason: string; audits?: AuditResult },
): Promise<void> {
  await writeReservedJson(skillDir, UNAUDITED_MARKER, {
    unaudited: true,
    source: details.source,
    reason: details.reason,
    ...(details.audits ? { audits: details.audits } : {}),
    installedAt: new Date().toISOString(),
  });
}

interface SkillDirScan {
  blockedReason?: string;
  warnings: string[];
  files: Array<{ path: string; sizeBytes: number; sha256: string; kind: string }>;
}

type StaticBinaryFormat = "png" | "jpeg" | "gif" | "webp" | "pdf";

const STATIC_BINARY_EXTENSIONS: Record<string, StaticBinaryFormat> = {
  ".png": "png",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".gif": "gif",
  ".webp": "webp",
  ".pdf": "pdf",
};

function startsWithBytes(bytes: Buffer, prefix: number[]): boolean {
  return bytes.length >= prefix.length && bytes.subarray(0, prefix.length).equals(Buffer.from(prefix));
}

function isNativeExecutable(bytes: Buffer): boolean {
  return startsWithBytes(bytes, [0x7f, 0x45, 0x4c, 0x46])
    || startsWithBytes(bytes, [0x4d, 0x5a])
    || [
      [0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf],
      [0xce, 0xfa, 0xed, 0xfe], [0xcf, 0xfa, 0xed, 0xfe],
      [0xca, 0xfe, 0xba, 0xbe], [0xbe, 0xba, 0xfe, 0xca],
    ].some((signature) => startsWithBytes(bytes, signature));
}

function detectStaticBinaryFormat(bytes: Buffer): StaticBinaryFormat | undefined {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff]) && bytes.length >= 4 && bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) return "jpeg";
  if ((bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a") && bytes.at(-1) === 0x3b) return "gif";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" && bytes.readUInt32LE(4) === bytes.length - 8) return "webp";
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-" && bytes.lastIndexOf(Buffer.from("%%EOF")) >= Math.max(5, bytes.length - 1024)) return "pdf";
  return undefined;
}

function portableSkillPath(path: string): string {
  return path.split(sep).join("/");
}

async function scanSkillDirectory(skillDir: string): Promise<SkillDirScan> {
  const result: SkillDirScan = { warnings: [], files: [] };
  const root = await realpath(skillDir);
  const queue = [{ dir: root, depth: 0 }];
  let scanned = 0;
  let totalBytes = 0;
  let entryCount = 0;
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    try {
      const entries = await opendir(dir);
      for await (const entry of entries) {
        const full = join(dir, entry.name);
        const label = relative(root, full);
        if (entry.name === ".git" && dir === root) continue;
        if (++entryCount > 2000 || depth > 32) {
          result.blockedReason = `${label}: skill directory scan limit exceeded`;
          return result;
        }
        if (entry.name === ".git" || entry.name === "." || entry.name === ".." || /[\\/\x00-\x1f\x7f:]/.test(entry.name) || /[. ]$/.test(entry.name)) {
          result.blockedReason = `${label}: unsafe path in skill bundle`;
          return result;
        }
        if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
          result.blockedReason = `${label}: unscannable symlink or special file in skill bundle`;
          return result;
        }
        if (entry.isDirectory()) {
          queue.push({ dir: full, depth: depth + 1 });
          continue;
        }
        const fileInfo = await lstat(full);
        if (++scanned > MAX_SCANNED_FILES) {
          result.blockedReason = `${label}: skill file scan limit exceeded (${MAX_SCANNED_FILES} files)`;
          return result;
        }
        const { bytes, mtimeMs } = await readBoundedSkillFile(full, [root], MAX_SKILL_FILE_BYTES);
        const currentInfo = await lstat(full);
        if (!currentInfo.isFile() || currentInfo.dev !== fileInfo.dev || currentInfo.ino !== fileInfo.ino || currentInfo.size !== fileInfo.size || bytes.length !== currentInfo.size || currentInfo.mtimeMs !== mtimeMs || currentInfo.ctimeMs !== fileInfo.ctimeMs || (currentInfo.mode & 0o777) !== (fileInfo.mode & 0o777)) {
          result.blockedReason = `${label}: file changed during bounded scan`;
          return result;
        }
        totalBytes += bytes.length;
        if (totalBytes > MAX_SCANNED_TOTAL_BYTES) {
          result.blockedReason = `${label}: total skill scan size limit exceeded`;
          return result;
        }
        const extension = extname(entry.name).toLowerCase();
        const expectedFormat = STATIC_BINARY_EXTENSIONS[extension];
        const detectedFormat = detectStaticBinaryFormat(bytes);
        if (isNativeExecutable(bytes)) {
          result.blockedReason = `${label}: native executable content is not allowed in skill bundles`;
          return result;
        }
        if (expectedFormat || detectedFormat) {
          if (!detectedFormat || !expectedFormat || expectedFormat !== detectedFormat) {
            result.blockedReason = `${label}: static binary asset extension/signature mismatch; supported data assets require matching PNG, JPEG, GIF, WebP, or PDF signatures`;
            return result;
          }
          if ((fileInfo.mode & 0o111) !== 0) {
            result.blockedReason = `${label}: executable binary assets are not allowed in skill bundles`;
            return result;
          }
          result.files.push({
            path: portableSkillPath(label),
            sizeBytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            kind: `static-binary:${detectedFormat}`,
          });
          continue;
        }
        let content: string;
        try {
          content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(content)) throw new Error("binary control content");
        } catch {
          result.blockedReason = `${label}: unscannable or unsupported binary content; only non-executable PNG, JPEG, GIF, WebP, or PDF data assets are allowed`;
          return result;
        }
        result.files.push({
          path: portableSkillPath(label),
          sizeBytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          kind: "utf8-text",
        });
        const scan = scanForPromptInjection(content);
        if (scan.blocked) {
          result.blockedReason = `${relative(root, full)}: ${scan.reason}`;
          return result;
        }
        for (const warning of scan.warnings) {
          result.warnings.push(`${relative(root, full)}: ${warning}`);
        }
      }
    } catch (err) {
      console.error(`[skill-installer] failed to scan ${dir}: ${(err as Error).message}`);
      result.blockedReason = `${relative(root, dir) || "."}: unscannable content — ${(err as Error).message}`;
      return result;
    }
  }
  result.files.sort((left, right) => left.path.localeCompare(right.path));
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

async function installStagedSkill(installDir: string, name: string, prepare: (stagedDir: string) => Promise<void>): Promise<void> {
  const destDir = resolveSkillDir(installDir, name);
  if (!destDir) throw new Error("Invalid skill name or destination containment failure");
  await mkdir(installDir, { recursive: true });
  const installInfo = await lstat(installDir);
  if (!installInfo.isDirectory() || installInfo.isSymbolicLink()) {
    throw new Error(`Symlinked or invalid skill install directory rejected: ${installDir}`);
  }
  const transactionDir = await mkdtemp(join(installDir, `.${name}.superskill-stage-`));
  const stagedDir = join(transactionDir, name);
  const backupDir = join(transactionDir, "previous");
  let movedExisting = false;
  let preserveTransaction = false;
  try {
    await prepare(stagedDir);
    await assertNoDestinationSymlinks(stagedDir);
    await assertNoDestinationSymlinks(destDir);
    try {
      const existing = await lstat(destDir);
      if (!existing.isDirectory()) throw new Error(`Skill destination is not a directory: ${destDir}`);
      await rename(destDir, backupDir);
      movedExisting = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      await rename(stagedDir, destDir);
    } catch (error) {
      if (movedExisting) {
        try {
          await rename(backupDir, destDir);
          movedExisting = false;
        } catch (restoreError) {
          preserveTransaction = true;
          throw new Error(`Install failed and previous skill could not be restored; preserved at ${backupDir}: ${(restoreError as Error).message}`);
        }
      }
      throw error;
    }
  } finally {
    if (!preserveTransaction) {
      await rm(transactionDir, { recursive: true, force: true }).catch((error: unknown) => {
        console.error(`[skill-installer] failed to clean staged install ${transactionDir}: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
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
  parsed: ParsedSource,
  options?: InstallOptions,
): Promise<InstallResult> {
  const installDir = _installDir ?? getInstallDir();
  const warnings: string[] = [];
  const errors: string[] = [];
  const blocked: string[] = [];
  const installed: string[] = [];

  // Step 1: Discover skills from skills.sh publisher page
  const publisherSkills = await fetchPublisherSkills(parsed.owner, parsed.repo);
  if (publisherSkills.length === 0) {
    return {
      success: false,
      installed: [],
      errors: [`No skills found on skills.sh for ${parsed.owner}/${parsed.repo}. Trying GitHub fallback...`],
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

  const candidates: Array<{ skillRef: PublisherSkill; pageData: NonNullable<Awaited<ReturnType<typeof fetchSkillPage>>>; allPass: boolean }> = [];

  for (const skillRef of toInstall) {
    try {
      if (!isValidSkillName(skillRef.skill)) {
        blocked.push(`${skillRef.skill}: BLOCKED — invalid skill name`);
        continue;
      }
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
      candidates.push({ skillRef, pageData, allPass });
    } catch (err) {
      errors.push(`${skillRef.skill}: ${(err as Error).message}`);
    }
  }

  if (candidates.length > 0) {
    let tmpDir: string | null = null;
    try {
      tmpDir = await cloneRepo(parsed.repoUrl, parsed.ref);
      const commit = await resolveGitCommit(tmpDir);
      const skills = await discoverSkills(tmpDir, parsed.subpath);
      for (const { skillRef, pageData, allPass } of candidates) {
        const matches = skills.filter((skill) => skill.name === skillRef.skill);
        if (matches.length !== 1) {
          errors.push(`${skillRef.skill}: expected one repository skill subtree at commit ${commit}, found ${matches.length}`);
          continue;
        }
        const skill = matches[0];
        try {
          assertDefaultClaudeMetadata(installDir, skill.metadata);
        } catch (err) {
          blocked.push(`${skillRef.skill}: BLOCKED — ${(err as Error).message}`);
          continue;
        }
        const scan = await scanSkillDirectory(skill.skillDir);
        if (scan.blockedReason) {
          blocked.push(`${skillRef.skill}: BLOCKED — ${scan.blockedReason}`);
          continue;
        }
        warnings.push(...scan.warnings.map((warning) => `${skillRef.skill}: ${warning}`));

        const auditDetail = `gen=${pageData.audits.gen}, socket=${pageData.audits.socket}, snyk=${pageData.audits.snyk}`;
        const sourceUrl = pageData.sourceUrl || `https://skills.sh/${skillRef.owner}/${skillRef.repo}/${skillRef.skill}`;
        try {
          await installStagedSkill(installDir, skillRef.skill, async (stagedDir) => {
            await cp(skill.skillDir, stagedDir, {
              recursive: true,
              filter: async (src) => relative(skill.skillDir, src) !== ".git",
            });
            await writeReservedJson(stagedDir, PROVENANCE_FILE, {
              installedAt: new Date().toISOString(),
              source: "skills.sh",
              sourceUrl,
              sourceResponseBytes: pageData.sourceResponseBytes ?? null,
              ...(pageData.sourceRef ? { pageReportedRef: pageData.sourceRef } : {}),
              repositoryUrl: parsed.repoUrl,
              requestedRef: parsed.ref ?? null,
              installedCommit: commit,
              audits: pageData.audits,
              auditBinding: "unversioned-repository",
              auditScope: "skills.sh page audit is not bound to the installed repository commit",
              bundleHashAlgorithm: "sha256",
              bundleHashScope: "each copied source file excluding Git metadata and installer-generated sidecars",
              bundleFiles: scan.files,
              bundleScanScope: "UTF-8 text files were prompt-scanned; supported PNG/JPEG/GIF/WebP/PDF assets were signature/extension checked and hashed, not prompt-scanned",
              installs: pageData.installs,
              stars: pageData.stars,
            });
            if (!allPass) {
              await writeUnauditedMarker(stagedDir, {
                source: "skills.sh",
                reason: `audits not all pass (${auditDetail}); installed with allowUnaudited`,
                audits: pageData.audits,
              });
            }
          });
          installed.push(skillRef.skill);
          warnings.push(`${skillRef.skill}: skills.sh audits are not bound to installed repository commit ${commit}; recorded as an unversioned repository audit`);
        } catch (err) {
          errors.push(`${skillRef.skill}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors.push(`Could not install audited skills from ${parsed.owner}/${parsed.repo}: ${(err as Error).message}`);
    } finally {
      if (tmpDir) await cleanupClone(tmpDir);
    }
  }

  if (installed.length > 0) warnings.push(PROMPT_SCAN_NOTICE);
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

  let tmpDir: string | null = null;
  const warnings: string[] = [];
  const blocked: string[] = [];

  try {
    // Clone
    tmpDir = await cloneRepo(parsed.repoUrl, parsed.ref);
    const commit = await resolveGitCommit(tmpDir);

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
        assertDefaultClaudeMetadata(installDir, skill.metadata);
        const scan = await scanSkillDirectory(skill.skillDir);
        if (scan.blockedReason) {
          blocked.push(`${skill.name}: BLOCKED — ${scan.blockedReason}`);
          continue;
        }
        for (const w of scan.warnings) {
          warnings.push(`${skill.name}: ${w}`);
        }

        await installStagedSkill(installDir, skill.name, async (stagedDir) => {
          await cp(skill.skillDir, stagedDir, {
            recursive: true,
            filter: async (src) => relative(skill.skillDir, src) !== ".git",
          });
          await writeReservedJson(stagedDir, PROVENANCE_FILE, {
            installedAt: new Date().toISOString(),
            source: "github-fallback",
            repositoryUrl: parsed.repoUrl,
            requestedRef: parsed.ref ?? null,
            installedCommit: commit,
            auditBinding: "no-skills-sh-audit",
            bundleHashAlgorithm: "sha256",
            bundleHashScope: "each copied source file excluding Git metadata and installer-generated sidecars",
            bundleFiles: scan.files,
            bundleScanScope: "UTF-8 text files were prompt-scanned; supported PNG/JPEG/GIF/WebP/PDF assets were signature/extension checked and hashed, not prompt-scanned",
          });
          await writeUnauditedMarker(stagedDir, {
            source: "github-fallback",
            reason: "skills.sh was unreachable; no audit results available",
          });
        });
        installed.push(skill.name);
      } catch (err) {
        errors.push(`${skill.name}: ${(err as Error).message}`);
      }
    }

    if (installed.length > 0) warnings.push(PROMPT_SCAN_NOTICE);
    return { success: installed.length > 0, installed, errors, warnings, blocked };
  } catch (error) {
    console.error(`[skill-installer] GitHub fallback failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, installed: [], errors: [error instanceof Error ? error.message : String(error)], warnings, blocked };
  } finally {
    // Clean up temp directory
    if (tmpDir) {
      await cleanupClone(tmpDir);
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

  // Try skills.sh first (secure path with audit results)
  let shResult: InstallResult;
  let fetchFailed = false;
  let rejectedResponse = false;
  try {
    shResult = await installFromSkillsSh(parsed, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rejectedResponse = /skills\.sh response exceeds size limit|skills\.sh response is not valid UTF-8/i.test(message);
    fetchFailed = !rejectedResponse;
    shResult = {
      success: false,
      installed: [],
      errors: [`${rejectedResponse ? "skills.sh response refused" : "skills.sh unreachable"}: ${message}`],
      warnings: [],
      blocked: [],
    };
  }

  // Audited installs or explicit blocks always win — never fall back for these
  if (shResult.installed.length > 0 || shResult.blocked.length > 0) {
    return shResult;
  }

  if (rejectedResponse) return shResult;

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
      let provenance: Record<string, unknown> = {};
      try {
        const { bytes } = await readBoundedSkillFile(join(dir, PROVENANCE_FILE), [await realpath(installDir)]);
        const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) provenance = parsed as Record<string, unknown>;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[skill-installer] failed to read provenance for ${dir}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const candidates = [
        join(dir, "SKILL.md"),
        join(dir, "skills", entry.name, "SKILL.md"),
      ];

      for (const candidate of candidates) {
        try {
          const { bytes } = await readBoundedSkillFile(candidate, [await realpath(installDir)]);
          const content = bytes.toString("utf-8");
          const { data } = matter(content);
          if (typeof data.name === "string") {
            const audits = frontmatterAudits(provenance) ?? frontmatterAudits(data);
            skills.push({
              name: data.name,
              description: typeof data.description === "string" ? data.description : "",
              dir,
              ...(typeof provenance.source === "string" ? { source: provenance.source } : typeof data.source === "string" ? { source: data.source } : {}),
              ...(audits ? { audits } : {}),
            });
            break;
          }
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[skill-installer] failed to read installed skill ${candidate}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[skill-installer] failed to list installed skills: ${error instanceof Error ? error.message : String(error)}`);
  }

  return skills;
}
