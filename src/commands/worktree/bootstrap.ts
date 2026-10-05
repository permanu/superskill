// SPDX-License-Identifier: Apache-2.0
import { readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { seedWorktree, type SeedResult } from "../../lib/worktree/seed.js";
import { readPolicy } from "../../lib/worktree/state.js";

const ENV_MODULE = "../../lib/worktree/env.js";
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENV_BLOCK_BEGIN = "# >>> superskill worktree-env";
const ENV_BLOCK_END = "# <<< superskill worktree-env <<<";

export interface WorktreeBootstrapArgs {
  source?: "worktree-create" | "session";
  json?: boolean;
  claudeEnv?: boolean;
}

export interface WorktreeBootstrapResult {
  skipped: boolean;
  reason?: string;
  worktreeRoot: string;
  repoId?: string;
  seeded?: SeedResult;
  claudeEnvFile?: string | null;
  notes: string[];
}

interface EnvExport {
  name: string;
  value: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function samePath(a: string, b: string): Promise<boolean> {
  if (resolve(a) === resolve(b)) return true;
  try {
    const [ra, rb] = await Promise.all([realpath(a), realpath(b)]);
    return ra === rb;
  } catch {
    return false;
  }
}

function normalizeEnvExports(raw: unknown): EnvExport[] {
  const out: EnvExport[] = [];
  const push = (name: unknown, value: unknown): void => {
    if (typeof name !== "string" || typeof value !== "string") return;
    if (!ENV_NAME_PATTERN.test(name)) return;
    out.push({ name, value });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (Array.isArray(item)) {
        push(item[0], item[1]);
      } else if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        push(record.name, record.value);
      }
    }
    return out;
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.vars)) return normalizeEnvExports(record.vars);
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        push(key, value);
      } else if (value && typeof value === "object") {
        push(key, (value as Record<string, unknown>).value);
      }
    }
  }
  return out;
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function isUnsafeEnvValue(value: string): boolean {
  return value.includes("\n") || value.includes("\r");
}

async function writeEnvBlock(filePath: string, vars: EnvExport[], notes: string[]): Promise<number> {
  const safe: EnvExport[] = [];
  for (const variable of vars) {
    if (isUnsafeEnvValue(variable.value)) {
      notes.push(`skipped ${variable.name}: value contains a newline`);
      continue;
    }
    safe.push(variable);
  }
  if (safe.length === 0) return 0;

  const block = [
    ENV_BLOCK_BEGIN,
    ...safe.map((variable) => `export ${variable.name}=${shellSingleQuote(variable.value)}`),
    ENV_BLOCK_END,
    "",
  ].join("\n");

  let existing = "";
  try {
    existing = await readFile(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }

  const begin = existing.indexOf(ENV_BLOCK_BEGIN);
  let updated: string;
  if (begin !== -1) {
    const end = existing.indexOf(ENV_BLOCK_END, begin);
    const regionEnd =
      end === -1
        ? existing.length
        : end + ENV_BLOCK_END.length + (existing[end + ENV_BLOCK_END.length] === "\n" ? 1 : 0);
    updated = existing.slice(0, begin) + block + existing.slice(regionEnd);
  } else {
    const strayEnd = existing.indexOf(ENV_BLOCK_END);
    const base =
      strayEnd === -1
        ? existing
        : existing.slice(0, strayEnd) + existing.slice(strayEnd + ENV_BLOCK_END.length);
    const separator = base.length > 0 && !base.endsWith("\n") ? "\n" : "";
    updated = `${base}${separator}${block}`;
  }

  await writeFile(filePath, updated, { encoding: "utf-8" });
  return safe.length;
}

async function loadEnvExports(worktreeRoot: string, notes: string[]): Promise<EnvExport[]> {
  try {
    const mod = (await import(ENV_MODULE)) as Record<string, unknown>;
    const resolveEnv = mod.resolveWorktreeEnv;
    if (typeof resolveEnv !== "function") {
      notes.push("env module does not export resolveWorktreeEnv");
      return [];
    }
    const raw = await (resolveEnv as (root: string) => Promise<unknown>)(worktreeRoot);
    const vars = normalizeEnvExports(raw);
    if (vars.length === 0) notes.push("env module returned no variables");
    return vars;
  } catch (err) {
    notes.push(`env module unavailable: ${errorMessage(err)}`);
    return [];
  }
}

export async function worktreeBootstrapCommand(
  args: WorktreeBootstrapArgs,
  _ctx: CommandContext,
): Promise<WorktreeBootstrapResult> {
  const worktreeRoot = process.cwd();
  const notes: string[] = [];
  try {
    const policy = await readPolicy(worktreeRoot);
    if (!policy) {
      return { skipped: true, reason: "repo not activated", worktreeRoot, notes };
    }

    const source = args.source ?? "worktree-create";

    if (source === "session") {
      if (!args.claudeEnv) {
        return { skipped: true, reason: "claudeEnv not requested", worktreeRoot, repoId: policy.repoId, notes };
      }
      const envFile = process.env.CLAUDE_ENV_FILE;
      if (!envFile) {
        return {
          skipped: true,
          reason: "CLAUDE_ENV_FILE not set",
          worktreeRoot,
          repoId: policy.repoId,
          claudeEnvFile: null,
          notes,
        };
      }
      const vars = await loadEnvExports(worktreeRoot, notes);
      if (vars.length === 0) {
        return {
          skipped: true,
          reason: "no env vars resolved",
          worktreeRoot,
          repoId: policy.repoId,
          claudeEnvFile: envFile,
          notes,
        };
      }
      const written = await writeEnvBlock(envFile, vars, notes);
      if (written === 0) {
        return {
          skipped: true,
          reason: "no writable env vars",
          worktreeRoot,
          repoId: policy.repoId,
          claudeEnvFile: envFile,
          notes,
        };
      }
      notes.push(`wrote ${written} env var(s) to ${envFile}`);
      return { skipped: false, worktreeRoot, repoId: policy.repoId, claudeEnvFile: envFile, notes };
    }

    if (!policy.activation.seed) {
      return { skipped: true, reason: "seeding disabled by policy", worktreeRoot, repoId: policy.repoId, notes };
    }
    if (process.env.SUPERSKILL_WORKTREE_BOOTSTRAP === "0") {
      return {
        skipped: true,
        reason: "disabled by SUPERSKILL_WORKTREE_BOOTSTRAP=0",
        worktreeRoot,
        repoId: policy.repoId,
        notes,
      };
    }
    if (await samePath(worktreeRoot, policy.repoRoot)) {
      return { skipped: true, reason: "main worktree", worktreeRoot, repoId: policy.repoId, notes };
    }

    const seeded = await seedWorktree(worktreeRoot, { dryRun: false });
    notes.push(...seeded.notes);
    if (seeded.seeded.length > 0) {
      notes.push(`seeded: ${seeded.seeded.map((s) => s.relative).join(", ")}`);
    } else if (seeded.skipped.length > 0) {
      notes.push(`nothing seeded (${seeded.skipped.map((s) => `${s.relative}: ${s.reason}`).join("; ")})`);
    }
    const result: WorktreeBootstrapResult = {
      skipped: seeded.seeded.length === 0,
      worktreeRoot,
      repoId: policy.repoId,
      seeded,
      notes,
    };
    if (seeded.seeded.length === 0) result.reason = "nothing to seed";
    return result;
  } catch (err) {
    return { skipped: true, reason: errorMessage(err), worktreeRoot, notes: [] };
  }
}
