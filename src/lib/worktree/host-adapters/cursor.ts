// SPDX-License-Identifier: Apache-2.0
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  backupOnce,
  containsSuperskillBootstrap,
  isSuperskillBootstrapCommand,
  readJsonSafe,
  writeJsonAtomic,
} from "./helpers.js";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const ADAPTER_ID = "cursor";

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
      console.error(`[worktree-adapter-cursor] cannot stat ${target}: ${code ?? String(err)}`);
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

function isOurs(entry: unknown): boolean {
  return isSuperskillBootstrapCommand(asRecord(entry)?.command);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withBootstrapHook(
  existing: Record<string, unknown>,
  command: string,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  if (typeof next.version !== "number") next.version = 1;
  const hooks = asRecord(next.hooks) ?? {};
  const sessionStart = Array.isArray(hooks.sessionStart)
    ? hooks.sessionStart.filter((entry) => !isOurs(entry))
    : [];
  sessionStart.push({ command });
  next.hooks = { ...hooks, sessionStart };
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

function claudeSettingsHaveSuperskillBootstrap(value: Record<string, unknown>): boolean {
  const hooks = asRecord(value.hooks);
  if (hooks === null) return false;
  return Object.values(hooks).some(
    (entries) => Array.isArray(entries) && entries.some(containsSuperskillBootstrap),
  );
}

async function claudeLocalHookDetected(ctx: AdapterContext): Promise<boolean> {
  const value = await readJsonSafe(join(ctx.repoRoot, ".claude", "settings.local.json"));
  if (value === null) return false;
  return claudeSettingsHaveSuperskillBootstrap(value);
}

async function apply(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, ".cursor", "hooks.json");
  const raw = await readJsonSafe(filePath);
  const existing = asRecord(raw) ?? {};
  const next = withBootstrapHook(existing, bootstrapCommand(ctx));
  const changed = !sameJson(existing, next);
  const notes: string[] = [];
  if (changed && !dryRun) {
    if (raw !== null) await backupOnce(filePath);
    await writeJsonAtomic(filePath, next);
  }
  if (await claudeLocalHookDetected(ctx)) {
    notes.push(
      "Cursor auto-imports Claude Code hooks; a superskill worktree bootstrap hook already exists in .claude/settings.local.json",
    );
  }
  return result(changed, dryRun, filePath, notes);
}

async function remove(ctx: AdapterContext, dryRun: boolean): Promise<AdapterActionResult> {
  const filePath = join(ctx.repoRoot, ".cursor", "hooks.json");
  const raw = await readJsonSafe(filePath);
  const root = asRecord(raw);
  const hooks = root ? asRecord(root.hooks) : null;
  if (!root || !hooks || !Array.isArray(hooks.sessionStart)) {
    return result(false, dryRun, filePath, []);
  }
  const entries = hooks.sessionStart as unknown[];
  const kept = entries.filter((entry) => !isOurs(entry));
  if (kept.length === entries.length) return result(false, dryRun, filePath, []);
  const next = { ...root, hooks: { ...hooks, sessionStart: kept } };
  if (!dryRun) {
    await backupOnce(filePath);
    await writeJsonAtomic(filePath, next);
  }
  return result(true, dryRun, filePath, []);
}

export const cursorAdapter: HostAdapter = {
  id: ADAPTER_ID,
  displayName: "Cursor",
  async detect(): Promise<boolean> {
    if (await pathExists(join(homedir(), ".cursor"))) return true;
    return pathExists(join(process.cwd(), ".cursor"));
  },
  plan: (ctx) => apply(ctx, true),
  install: (ctx) => apply(ctx, false),
  uninstall: (ctx) => remove(ctx, false),
};
