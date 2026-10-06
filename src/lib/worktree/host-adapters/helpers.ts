// SPDX-License-Identifier: Apache-2.0
import { constants, existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const LOG_PREFIX = "[host-adapters]";

export const BACKUP_SUFFIX = ".bak.superskill";

const SUPERSKILL_BOOTSTRAP_PATTERN = /superskill(-cli)?\b[\s\S]*?\bworktree\s+bootstrap\b/;

export function isSuperskillBootstrapCommand(command: unknown): boolean {
  return typeof command === "string" && SUPERSKILL_BOOTSTRAP_PATTERN.test(command);
}

export async function readTextSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`${LOG_PREFIX} cannot read ${path}: ${code ?? String(err)}`);
    }
    return null;
  }
}

export async function readJsonSafe(path: string): Promise<Record<string, unknown> | null> {
  const raw = await readTextSafe(path);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error(`${LOG_PREFIX} ignoring non-object JSON at ${path}`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    console.error(`${LOG_PREFIX} ignoring corrupt JSON at ${path}`);
    return null;
  }
}

export async function backupOnce(path: string): Promise<string | null> {
  const backupPath = `${path}${BACKUP_SUFFIX}`;
  try {
    await copyFile(path, backupPath, constants.COPYFILE_EXCL);
    return backupPath;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    if (code === "EEXIST") return backupPath;
    throw err;
  }
}

export async function writeTextAtomic(path: string, content: string, mode?: number): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.${basename(path)}.tmp-${process.pid}-${Date.now().toString(36)}`);
  try {
    const options = mode === undefined ? { encoding: "utf-8" as const } : { encoding: "utf-8" as const, mode };
    await writeFile(tmpPath, content, options);
    await rename(tmpPath, path);
  } catch (err) {
    try {
      await rm(tmpPath, { force: true });
    } catch (cleanupErr) {
      const code = (cleanupErr as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(`${LOG_PREFIX} cannot remove temp file ${tmpPath}: ${code ?? String(cleanupErr)}`);
      }
    }
    throw err;
  }
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await backupOnce(path);
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

export interface HookAdapterSpec {
  id: string;
  displayName: string;
  /** Hook event name, e.g. SessionStart. Defaults to SessionStart. */
  event?: string;
  file(ctx: AdapterContext): string;
  /** Builds the event entry this adapter owns, e.g. `{ hooks: [{ type: "command", command }] }`. */
  buildEntry(cli: string): Record<string, unknown>;
  detect(): boolean | Promise<boolean>;
}

type HookMode = "plan" | "install" | "uninstall";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function containsSuperskillBootstrap(entry: unknown): boolean {
  const record = asRecord(entry);
  if (record === null) return false;
  if (isSuperskillBootstrapCommand(record.command)) return true;
  return Array.isArray(record.hooks) ? record.hooks.some(containsSuperskillBootstrap) : false;
}

function removeBootstrap(root: Record<string, unknown>, event: string): number {
  const hooks = asRecord(root.hooks);
  if (hooks === null) return 0;
  const list = hooks[event];
  if (!Array.isArray(list)) return 0;
  const filtered = list.filter((entry) => !containsSuperskillBootstrap(entry));
  if (filtered.length === list.length) return 0;
  if (filtered.length > 0) hooks[event] = filtered;
  else delete hooks[event];
  if (Object.keys(hooks).length === 0) delete root.hooks;
  return list.length - filtered.length;
}

function addBootstrap(root: Record<string, unknown>, event: string, entry: Record<string, unknown>): void {
  const hooks = asRecord(root.hooks) ?? {};
  root.hooks = hooks;
  const list = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
  list.push(entry);
  hooks[event] = list;
}

function isEffectivelyEmpty(root: Record<string, unknown>): boolean {
  const keys = Object.keys(root);
  if (keys.length === 0) return true;
  if (keys.length === 1 && keys[0] === "hooks") {
    const hooks = asRecord(root.hooks);
    return hooks !== null && Object.keys(hooks).length === 0;
  }
  return false;
}

async function runHookAdapter(
  spec: HookAdapterSpec,
  ctx: AdapterContext,
  mode: HookMode,
): Promise<AdapterActionResult> {
  const file = spec.file(ctx);
  const dryRun = mode === "plan";
  const result: AdapterActionResult = { adapter: spec.id, changed: false, dryRun, files: [], notes: [] };
  const existing = await readJsonSafe(file);

  if (existing === null && mode === "uninstall") {
    if (existsSync(file)) result.notes.push(`could not parse ${file}; left unchanged`);
    return result;
  }
  if (existing === null && existsSync(file) && mode !== "uninstall") {
    result.notes.push(`existing ${file} is not a JSON object; it will be backed up and replaced`);
  }

  const base = existing ?? {};
  const next = structuredClone(base);
  const event = spec.event ?? "SessionStart";
  let removed = 0;
  if (mode === "uninstall") {
    removed = removeBootstrap(next, event);
  } else {
    removeBootstrap(next, event);
    addBootstrap(next, event, spec.buildEntry(ctx.superskillCli ?? "superskill-cli"));
  }

  if (isDeepStrictEqual(base, next)) return result;
  result.changed = true;
  result.files.push(file);

  if (mode === "uninstall") {
    if (removed > 0 && isEffectivelyEmpty(next) && existsSync(`${file}${BACKUP_SUFFIX}`)) {
      result.notes.push("restored pre-install backup");
      if (!dryRun) await copyFile(`${file}${BACKUP_SUFFIX}`, file);
      return result;
    }
    if (dryRun) {
      result.notes.push(`would remove superskill hook from ${file}`);
    } else {
      await writeTextAtomic(file, `${JSON.stringify(next, null, 2)}\n`);
      result.notes.push(`removed superskill hook from ${file}`);
    }
    return result;
  }

  if (dryRun) {
    result.notes.push(`would install superskill hook in ${file}`);
  } else {
    await writeJsonAtomic(file, next);
    result.notes.push(`installed superskill hook in ${file}`);
  }
  return result;
}

export function createHookAdapter(spec: HookAdapterSpec): HostAdapter {
  return {
    id: spec.id,
    displayName: spec.displayName,
    detect: async () => spec.detect(),
    plan: (ctx) => runHookAdapter(spec, ctx, "plan"),
    install: (ctx) => runHookAdapter(spec, ctx, "install"),
    uninstall: (ctx) => runHookAdapter(spec, ctx, "uninstall"),
  };
}
