// SPDX-License-Identifier: Apache-2.0
import { open, readFile, readdir, realpath } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { SessionTrace } from "./types.js";
import { estimateTokens } from "../token-estimator.js";

const STEERING_CONTENT_CAP = 40_000;

export interface SteeringFile {
  path: string;
  realPath: string;
  scope: "project" | "global";
  lines: number;
  chars: number;
  estimatedTokens: number;
  content: string;
  truncated?: boolean;
}

export interface RepoContext {
  root: string;
  isGit: boolean;
  scripts: Record<string, string>;
  checkScripts: string[];
  hasCi: boolean;
  hasPreCommit: boolean;
  steering: SteeringFile[];
}

const VERIFY_NAME_RE = /(lint|typecheck|type-check|check|test|verify|build)/i;
const VERIFY_COMMAND_RE = /(npm|pnpm|yarn|bun)\s+(run\s+)?(test|lint|typecheck|check)|tsc\b|vitest|jest|pytest|cargo\s+(test|check|clippy)|go\s+(test|vet)|swift\s+(test|build)|make\s+(test|lint|check)|eslint|prettier\s+--check|ruff|mypy|golangci/;

export function isVerificationCommand(command: string): boolean {
  return VERIFY_COMMAND_RE.test(command);
}

async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function hasWorkflowFiles(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name));
  } catch {
    return false;
  }
}

async function readSteering(path: string, scope: "project" | "global"): Promise<SteeringFile | null> {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const info = await handle.stat();
    if (!info.isFile()) return null;
    const buffer = Buffer.alloc(Math.min(info.size, STEERING_CONTENT_CAP));
    let bytes = 0;
    while (bytes < buffer.length) {
      const { bytesRead } = await handle.read(buffer, bytes, buffer.length - bytes, null);
      if (bytesRead === 0) break;
      bytes += bytesRead;
    }
    const truncated = info.size > bytes;
    const decoder = new StringDecoder("utf-8");
    const retained = buffer.subarray(0, bytes);
    const content = truncated ? decoder.write(retained) : decoder.end(retained);
    return {
      path,
      realPath: await realpath(path),
      scope,
      lines: content.split(/\r?\n/).length,
      chars: content.length,
      estimatedTokens: estimateTokens(content),
      content,
      truncated,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[watchdog] steering read failed: ${code ?? "unreadable steering file"}`);
    return null;
  } finally {
    await handle?.close();
  }
}

const PROJECT_STEERING = ["AGENTS.md", "CLAUDE.md", ".claude/CLAUDE.md", "GEMINI.md"];
const GLOBAL_STEERING = [".claude/CLAUDE.md", ".agents/AGENTS.md", ".codex/AGENTS.md", ".gemini/GEMINI.md"];

export async function collectSteeringFiles(repoRoot: string): Promise<SteeringFile[]> {
  const files: SteeringFile[] = [];
  const seen = new Set<string>();

  for (const rel of PROJECT_STEERING) {
    const file = await readSteering(join(repoRoot, rel), "project");
    if (file && !seen.has(file.realPath)) {
      seen.add(file.realPath);
      files.push(file);
    }
  }
  for (const rel of GLOBAL_STEERING) {
    const file = await readSteering(join(homedir(), rel), "global");
    if (file && !seen.has(file.realPath)) {
      seen.add(file.realPath);
      files.push(file);
    }
  }
  return files;
}

export async function resolveRepoRoot(root: string): Promise<string> {
  const absolute = resolve(root);
  try {
    const { stdout } = await promisify(execFile)("git", ["-C", absolute, "rev-parse", "--show-toplevel"], { timeout: 2000, maxBuffer: 4096 });
    return stdout.trim() || absolute;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code !== "ENOENT") console.error(`[watchdog] git root lookup failed: ${code}`);
    return absolute;
  }
}

export async function collectRepoContext(root: string): Promise<RepoContext> {
  const repoRoot = await resolveRepoRoot(root);
  const isGit = existsSync(join(repoRoot, ".git"));
  const packageJson = await readJsonSafe<{ scripts?: Record<string, string> }>(join(repoRoot, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  const checkScripts = Object.entries(scripts)
    .filter(([name, command]) => VERIFY_NAME_RE.test(name) || VERIFY_COMMAND_RE.test(command))
    .map(([name]) => name);

  const hasCi = await hasWorkflowFiles(join(repoRoot, ".github", "workflows"));
  const hasPreCommit =
    existsSync(join(repoRoot, ".git", "hooks", "pre-commit")) ||
    existsSync(join(repoRoot, ".husky")) ||
    existsSync(join(repoRoot, "lefthook.yml")) ||
    existsSync(join(repoRoot, "lefthook.yaml")) ||
    existsSync(join(repoRoot, ".pre-commit-config.yaml"));

  const steering = await collectSteeringFiles(repoRoot);
  return { root: repoRoot, isGit, scripts, checkScripts, hasCi, hasPreCommit, steering };
}

export function traceHasVerification(trace: SessionTrace, ctx: RepoContext): boolean {
  if (trace.commands.some(isVerificationCommand)) return true;
  for (const script of ctx.checkScripts) {
    const pattern = new RegExp(`(npm|pnpm|yarn|bun)\\s+(run\\s+)?${script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (trace.commands.some((command) => pattern.test(command))) return true;
  }
  return false;
}
