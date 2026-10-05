// SPDX-License-Identifier: Apache-2.0
import { readFile, readdir, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
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
  let real: string;
  try {
    real = await realpath(path);
  } catch {
    return null;
  }
  let content: string;
  try {
    content = await readFile(real, "utf-8");
  } catch {
    return null;
  }
  const capped = content.length > STEERING_CONTENT_CAP ? content.slice(0, STEERING_CONTENT_CAP) : content;
  return {
    path,
    realPath: real,
    scope,
    lines: content.split(/\r?\n/).length,
    chars: content.length,
    estimatedTokens: estimateTokens(content),
    content: capped,
  };
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

export async function collectRepoContext(root: string): Promise<RepoContext> {
  const repoRoot = resolve(root);
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
