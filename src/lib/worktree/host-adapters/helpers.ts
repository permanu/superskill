// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { AdapterActionResult, AdapterContext, HostAdapter } from "./types.js";

const LOG_PREFIX = "[host-adapters]";

export const BACKUP_SUFFIX = ".bak.superskill";

function commandArgv(command: string): string[] | null {
  if (/[\r\n]/.test(command.trim())) return null;
  const args: string[] = [];
  let token = "";
  let quote = "";
  let started = false;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (char === "\\" && quote !== "'") {
      if (index + 1 === command.length) return null;
      token += command[++index];
      started = true;
    } else if (quote) {
      if (char === quote) quote = "";
      else {
        if (quote === '"' && /[$`\n\r]/.test(char)) return null;
        token += char;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(token);
      token = "";
      started = false;
    } else {
      if (/[;&|<>$`()]/.test(char)) return null;
      token += char;
      started = true;
    }
  }
  if (quote) return null;
  if (started) args.push(token);
  return args;
}

function bootstrapArgv(args: string[], depth = 0): boolean {
  if (depth > 2 || args.length === 0) return false;
  const executable = basename(args[0]);
  if (["sh", "bash", "zsh"].includes(executable)) {
    if (args.length !== 3 || !["-c", "-lc"].includes(args[1])) return false;
    const nested = commandArgv(args[2]);
    return nested !== null && bootstrapArgv(nested, depth + 1);
  }
  if (executable === "npx") {
    let index = 1;
    while (["-y", "--yes", "--prefer-online"].includes(args[index])) index += 1;
    return /^superskill(?:-cli)?(?:@[\w.+-]+)?$/.test(args[index] ?? "") &&
      args[index + 1] === "worktree" && args[index + 2] === "bootstrap";
  }
  const cliPath = (value: string) => /(?:^|\/)superskill\/(?:dist\/)?cli\.js$/.test(value);
  if (executable === "node" || executable === "nodejs") {
    return cliPath(args[1] ?? "") && args[2] === "worktree" && args[3] === "bootstrap";
  }
  return (executable === "superskill" || executable === "superskill-cli" || cliPath(args[0])) &&
    args[1] === "worktree" && args[2] === "bootstrap";
}

export function isSuperskillBootstrapCommand(command: unknown): boolean {
  if (typeof command !== "string") return false;
  const args = commandArgv(command);
  return args !== null && bootstrapArgv(args);
}

export function quoteCommandPath(path: string): string {
  return /^[\w./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;
}

export async function unsafePathReason(path: string, root: string): Promise<string | null> {
  const rel = relative(resolve(root), resolve(path));
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return `path is outside the trusted directory: ${path}`;
  }
  try {
    const rootInfo = await lstat(root);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return `symlink or non-directory root left unchanged: ${root}`;
    let current = await realpath(root);
    const parts = rel.split(sep);
    for (let index = 0; index < parts.length; index += 1) {
      current = join(current, parts[index]);
      let info;
      try {
        info = await lstat(current);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
      if (info.isSymbolicLink()) return `symlink path left unchanged: ${path}`;
      if (index === parts.length - 1 ? !info.isFile() : !info.isDirectory()) {
        return `non-regular path left unchanged: ${path}`;
      }
    }
    return null;
  } catch (err) {
    return `cannot inspect ${path}; left unchanged: ${String(err)}`;
  }
}

export async function requireSafePath(path: string, root = dirname(path)): Promise<void> {
  const reason = await unsafePathReason(path, root);
  if (reason !== null) throw new Error(reason);
}

export async function readTextSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, { encoding: "utf-8", flag: constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`${LOG_PREFIX} cannot read ${path}: ${code ?? String(err)}`);
      throw err;
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

export async function backupOnce(path: string, root = dirname(path)): Promise<string | null> {
  const backupPath = `${path}${BACKUP_SUFFIX}`;
  await requireSafePath(path, root);
  await requireSafePath(backupPath, root);
  try {
    const content = await readFile(path, { flag: constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK });
    await writeFile(backupPath, content, { flag: "wx", mode: 0o600 });
    return backupPath;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    if (code === "EEXIST") return backupPath;
    throw err;
  }
}

export async function writeTextAtomic(path: string, content: string, mode = 0o600, root = dirname(path), expected?: string | null): Promise<void> {
  await requireSafePath(path, root);
  const before = expected === undefined ? await readTextSafe(path) : expected;
  const dir = dirname(path);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await requireSafePath(path, root);
  const tmpPath = join(dir, `.${basename(path)}.tmp-${randomUUID()}`);
  try {
    await writeFile(tmpPath, content, { encoding: "utf-8", flag: "wx", mode });
    await requireSafePath(path, root);
    if (await readTextSafe(path) !== before) throw new Error(`${path} changed during write; left unchanged`);
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

export async function writeJsonAtomic(path: string, value: unknown, root = dirname(path), expected?: string | null): Promise<void> {
  await backupOnce(path, root);
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`, 0o600, root, expected);
}

export interface HookAdapterSpec {
  id: string;
  displayName: string;
  /** Hook event name, e.g. SessionStart. Defaults to SessionStart. */
  event?: string;
  file(ctx: AdapterContext): string;
  /** Builds the event entry this adapter owns, e.g. `{ hooks: [{ type: "command", command }] }`. */
  buildEntry(cli: string): Record<string, unknown>;
  detect(ctx?: AdapterContext): boolean | Promise<boolean>;
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

export function stripBootstrapEntries(list: unknown[]): unknown[] {
  return list.flatMap((entry): unknown[] => {
    const record = asRecord(entry);
    if (record === null) return [entry];
    if (isSuperskillBootstrapCommand(record.command)) return [];
    if (!Array.isArray(record.hooks)) return [entry];
    const hooks = stripBootstrapEntries(record.hooks);
    if (hooks.length === record.hooks.length) return [entry];
    return hooks.length > 0 ? [{ ...record, hooks }] : [];
  });
}

function removeBootstrap(root: Record<string, unknown>, event: string): number {
  const hooks = asRecord(root.hooks);
  if (hooks === null) return 0;
  const list = hooks[event];
  if (!Array.isArray(list)) return 0;
  const filtered = stripBootstrapEntries(list);
  if (isDeepStrictEqual(filtered, list)) return 0;
  if (filtered.length > 0) hooks[event] = filtered;
  else delete hooks[event];
  if (Object.keys(hooks).length === 0) delete root.hooks;
  return 1;
}

function addBootstrap(root: Record<string, unknown>, event: string, entry: Record<string, unknown>): void {
  const hooks = asRecord(root.hooks) ?? {};
  root.hooks = hooks;
  const list = Array.isArray(hooks[event]) ? (hooks[event] as unknown[]) : [];
  list.push(entry);
  hooks[event] = list;
}

export async function readHookConfig(file: string, root: string, event: string): Promise<
  { value: Record<string, unknown>; text: string | null; note?: undefined } | { value?: undefined; text?: undefined; note: string }
> {
  const unsafe = await unsafePathReason(file, root);
  if (unsafe !== null) return { note: unsafe };
  const unsafeBackup = await unsafePathReason(`${file}${BACKUP_SUFFIX}`, root);
  if (unsafeBackup !== null) return { note: unsafeBackup };
  let text: string | null;
  try {
    text = await readTextSafe(file);
  } catch {
    return { note: `cannot read ${file}; left unchanged` };
  }
  if (text === null) return { value: {}, text };
  let value: Record<string, unknown> | null;
  try {
    value = asRecord(JSON.parse(text));
  } catch {
    value = null;
  }
  if (value === null) return { note: `could not parse JSON object at ${file}; left unchanged` };
  if (value.hooks !== undefined && asRecord(value.hooks) === null) {
    return { note: `invalid hooks object at ${file}; left unchanged` };
  }
  const entries = asRecord(value.hooks)?.[event];
  if (entries !== undefined && !Array.isArray(entries)) return { note: `invalid ${event} hooks at ${file}; left unchanged` };
  return { value, text };
}

async function runHookAdapter(
  spec: HookAdapterSpec,
  ctx: AdapterContext,
  mode: HookMode,
): Promise<AdapterActionResult> {
  const file = spec.file(ctx);
  const dryRun = mode === "plan";
  const result: AdapterActionResult = { adapter: spec.id, changed: false, dryRun, files: [], notes: [] };
  const event = spec.event ?? "SessionStart";
  const loaded = await readHookConfig(file, ctx.repoRoot, event);
  if (loaded.note !== undefined) {
    result.notes.push(loaded.note);
    return result;
  }
  const base = loaded.value;
  const next = structuredClone(base);
  let removed = 0;
  if (mode === "uninstall") {
    removed = removeBootstrap(next, event);
  } else {
    removeBootstrap(next, event);
    addBootstrap(next, event, spec.buildEntry(quoteCommandPath(ctx.superskillCli ?? "superskill-cli")));
  }

  if (isDeepStrictEqual(base, next)) return result;
  result.changed = true;
  result.files.push(file);

  if (mode === "uninstall") {
    const backupFile = `${file}${BACKUP_SUFFIX}`;
    if (removed > 0 && await unsafePathReason(backupFile, ctx.repoRoot) === null) {
      const text = await readTextSafe(backupFile);
      let backup: Record<string, unknown> | null = null;
      if (text !== null) {
        try {
          backup = asRecord(JSON.parse(text));
        } catch {
          result.notes.push("invalid backup left unchanged");
        }
      }
      if (backup !== null) {
        const cleaned = structuredClone(backup);
        const removedBackup = removeBootstrap(cleaned, event);
        if (asRecord(cleaned.hooks) && Object.keys(cleaned.hooks as object).length === 0) delete cleaned.hooks;
        if (text !== null && isDeepStrictEqual(cleaned, next) && removedBackup === 0) {
          result.notes.push("restored pre-install backup");
          await writeTextAtomic(file, text, 0o600, ctx.repoRoot, loaded.text);
          return result;
        }
      }
    }
    if (dryRun) {
      result.notes.push(`would remove superskill hook from ${file}`);
    } else {
      await writeTextAtomic(file, `${JSON.stringify(next, null, 2)}\n`, 0o600, ctx.repoRoot, loaded.text);
      result.notes.push(`removed superskill hook from ${file}`);
    }
    return result;
  }

  if (dryRun) {
    result.notes.push(`would install superskill hook in ${file}`);
  } else {
    await writeJsonAtomic(file, next, ctx.repoRoot, loaded.text);
    result.notes.push(`installed superskill hook in ${file}`);
  }
  return result;
}

export function createHookAdapter(spec: HookAdapterSpec): HostAdapter {
  return {
    id: spec.id,
    displayName: spec.displayName,
    detect: async (ctx) => spec.detect(ctx),
    plan: (ctx) => runHookAdapter(spec, ctx, "plan"),
    install: (ctx) => runHookAdapter(spec, ctx, "install"),
    uninstall: (ctx) => runHookAdapter(spec, ctx, "uninstall"),
  };
}
