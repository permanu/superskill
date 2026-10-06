// SPDX-License-Identifier: Apache-2.0
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { backupOnce, isSuperskillBootstrapCommand, readJsonSafe, writeJsonAtomic } from "./helpers.js";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const ADAPTER_ID = "gemini";

function bootstrapCommand(ctx: AdapterContext): string {
  return `${ctx.superskillCli ?? "superskill-cli"} worktree bootstrap --source session`;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-adapter-gemini] cannot stat ${target}: ${code ?? String(err)}`);
    }
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function isOurs(value: unknown): boolean {
  return isSuperskillBootstrapCommand(asRecord(value)?.command);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stripOurs(entries: unknown[]): { entries: unknown[]; removed: boolean } {
  const keptEntries: unknown[] = [];
  let removed = false;
  for (const entry of entries) {
    const record = asRecord(entry);
    const hooks = record && Array.isArray(record.hooks) ? (record.hooks as unknown[]) : null;
    if (!record || !hooks) {
      keptEntries.push(entry);
      continue;
    }
    const keptHooks = hooks.filter((hook) => {
      if (!isOurs(hook)) return true;
      removed = true;
      return false;
    });
    if (hooks.length > 0 && keptHooks.length === 0) {
      removed = true;
      continue;
    }
    keptEntries.push({ ...record, hooks: keptHooks });
  }
  return { entries: keptEntries, removed };
}

function withBootstrapHook(
  existing: Record<string, unknown>,
  command: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  const hooks = asRecord(next.hooks) ?? {};
  const existingStart = Array.isArray(hooks.SessionStart) ? (hooks.SessionStart as unknown[]) : [];
  const cleaned = stripOurs(existingStart).entries;
  cleaned.push({ hooks: [{ type: "command", command }] });
  next.hooks = { ...hooks, SessionStart: cleaned };
  return next;
}

function result(
  changed: boolean,
  dryRun: boolean,
  filePath: string,
  notes: string[],
): AdapterActionResult {
  return { adapter: ADAPTER_ID, changed, dryRun, files: changed ? [filePath] : [], notes };
}

async function apply(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, ".gemini", "settings.json");
  const raw = await readJsonSafe(filePath);
  const existing = asRecord(raw) ?? {};
  const next = withBootstrapHook(existing, bootstrapCommand(ctx));
  const changed = !sameJson(existing, next);
  if (changed && !dryRun) {
    if (raw !== null) await backupOnce(filePath);
    await writeJsonAtomic(filePath, next);
  }
  return result(changed, dryRun, filePath, []);
}

async function remove(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, ".gemini", "settings.json");
  const raw = await readJsonSafe(filePath);
  const root = asRecord(raw);
  const hooks = root ? asRecord(root.hooks) : null;
  const existingStart = hooks ? hooks.SessionStart : null;
  if (!root || !hooks || !Array.isArray(existingStart)) {
    return result(false, dryRun, filePath, []);
  }
  const { entries, removed } = stripOurs(existingStart as unknown[]);
  if (!removed) return result(false, dryRun, filePath, []);
  const next = { ...root, hooks: { ...hooks, SessionStart: entries } };
  if (!dryRun) {
    await backupOnce(filePath);
    await writeJsonAtomic(filePath, next);
  }
  return result(true, dryRun, filePath, []);
}

export const geminiAdapter: HostAdapter = {
  id: ADAPTER_ID,
  displayName: "Gemini CLI",
  async detect(): Promise<boolean> {
    if (await pathExists(join(homedir(), ".gemini"))) return true;
    return pathExists(join(process.cwd(), ".gemini"));
  },
  plan: (ctx) => apply(ctx, true),
  install: (ctx) => apply(ctx, false),
  uninstall: (ctx) => remove(ctx, false),
};
