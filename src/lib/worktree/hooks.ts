// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { gitTopLevel, hashId, repoStateDir } from "./paths.js";
import { clearHookState, readHookState, writeHookState, type HookState } from "./state.js";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 5000;
const HOOK_STATE_VERSION = 1;
const DEFAULT_HOOK_MODE = 0o755;
const MANAGED_HOOK_KINDS = new Set<HookState["kind"]>(["block", "husky", "lefthook"]);

export type HookManagerKind = "block" | "husky" | "lefthook" | "precommit" | "none";

export interface HookManagerInfo {
  kind: HookManagerKind;
  hooksPath: string | null;
  hookFile: string;
}

export interface HookInstallResult {
  changed: boolean;
  kind: HookManagerKind;
  hookFile: string;
  backupPath: string | null;
  fingerprint: string;
  notes: string[];
}

export interface HookUninstallResult {
  removed: boolean;
  restored: boolean;
  notes: string[];
}

export const HOOK_START = "# >>> superskill worktree-start";
export const HOOK_END = "# <<< superskill worktree-end";

const HOOK_START_BYTES = Buffer.from(HOOK_START, "utf-8");
const HOOK_END_BYTES = Buffer.from(HOOK_END, "utf-8");
const SHEBANG_BYTES = Buffer.from("#!/bin/sh\n", "utf-8");
const NEWLINE_BYTES = Buffer.from("\n", "utf-8");

async function gitOutput(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, timeout: GIT_TIMEOUT_MS });
    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES") {
      console.error(`[worktree-hooks] git ${args.join(" ")} failed in ${cwd}: ${code}`);
    }
    return null;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-hooks] cannot stat ${path}: ${code ?? String(err)}`);
    }
    return false;
  }
}

async function readBytes(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-hooks] cannot read ${path}: ${code ?? String(err)}`);
    }
    return null;
  }
}

async function readText(path: string): Promise<string | null> {
  const bytes = await readBytes(path);
  return bytes === null ? null : bytes.toString("utf-8");
}

async function fileMode(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mode & 0o777;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-hooks] cannot stat ${path}: ${code ?? String(err)}`);
    }
    return null;
  }
}

async function atomicWrite(filePath: string, content: Buffer, mode: number): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.${basename(filePath)}.tmp-${process.pid}-${Date.now().toString(36)}`);
  try {
    await writeFile(tmpPath, content, { mode });
    await chmod(tmpPath, mode);
    await rename(tmpPath, filePath);
  } catch (err) {
    try {
      await rm(tmpPath, { force: true });
    } catch (cleanupErr) {
      const code = (cleanupErr as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(
          `[worktree-hooks] failed to remove temp file ${tmpPath}: ${code ?? String(cleanupErr)}`,
        );
      }
    }
    throw err;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function normalizeCliPath(cliPath: string | null | undefined): string | null {
  if (typeof cliPath !== "string") return null;
  const trimmed = cliPath.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function bootstrapRun(bin: string): string {
  return `( ${bin} worktree bootstrap --source worktree-create </dev/null >/dev/null 2>&1 &)`;
}

function bootstrapInvocation(cli: string | null): string {
  const condition = `if [ "$3" = "1" ] && printf '%s' "$1" | grep -Eq '^0+$'; then`;
  const fallbackCheck = "command -v superskill-cli >/dev/null 2>&1";
  if (cli === null) {
    return `${condition} ${fallbackCheck} && ${bootstrapRun("superskill-cli")} ; fi`;
  }
  const quoted = shellQuote(cli);
  return `${condition} { [ -x ${quoted} ] && ${bootstrapRun(quoted)} ; } || { ${fallbackCheck} && ${bootstrapRun("superskill-cli")} ; } ; fi`;
}

function blockBody(cli: string | null): string {
  return [
    bootstrapInvocation(cli),
    "true",
    "# superskill: guarded background bootstrap; this block always exits 0 and never changes the hook exit status.",
  ].join("\n");
}

export function hookBlock(fingerprint: string, cliPath: string | null): string {
  const cli = normalizeCliPath(cliPath);
  return [`${HOOK_START} fingerprint: ${fingerprint}`, blockBody(cli), HOOK_END].join("\n");
}

function fingerprintFor(cli: string | null): string {
  return hashId(blockBody(cli), 12);
}

interface BlockRegion {
  start: number;
  end: number;
  terminated: boolean;
}

function findRegion(content: Buffer): BlockRegion | null {
  const start = content.indexOf(HOOK_START_BYTES);
  if (start === -1) return null;
  const endMarker = content.indexOf(HOOK_END_BYTES, start + HOOK_START_BYTES.length);
  if (endMarker === -1) return { start, end: content.length, terminated: false };
  const after = endMarker + HOOK_END_BYTES.length;
  return {
    start,
    end: after < content.length && content[after] === 0x0a ? after + 1 : after,
    terminated: true,
  };
}

export async function postCheckoutPath(worktreeRoot: string): Promise<string> {
  const raw = await gitOutput(worktreeRoot, ["rev-parse", "--git-path", "hooks/post-checkout"]);
  if (raw) return isAbsolute(raw) ? raw : resolve(worktreeRoot, raw);
  return join(worktreeRoot, ".git", "hooks", "post-checkout");
}

export async function detectHookManager(worktreeRoot: string): Promise<HookManagerInfo> {
  const hooksPath = await gitOutput(worktreeRoot, ["config", "--get", "core.hooksPath"]);
  const repoRoot = (await gitTopLevel(worktreeRoot)) ?? worktreeRoot;
  const fallback = await postCheckoutPath(worktreeRoot);
  const resolvedHooksDir = hooksPath
    ? isAbsolute(hooksPath)
      ? hooksPath
      : resolve(repoRoot, hooksPath)
    : null;
  const hookAt = resolvedHooksDir ? join(resolvedHooksDir, "post-checkout") : fallback;

  if (hooksPath && hooksPath.includes(".husky")) {
    return { kind: "husky", hooksPath, hookFile: join(repoRoot, ".husky", "post-checkout") };
  }
  if (await fileExists(join(repoRoot, ".pre-commit-config.yaml"))) {
    return { kind: "precommit", hooksPath, hookFile: hookAt };
  }
  const lefthookMarker =
    (await fileExists(join(repoRoot, "lefthook.yml"))) ||
    (await fileExists(join(repoRoot, "lefthook.yaml"))) ||
    (await fileExists(join(repoRoot, ".lefthook")));
  if (lefthookMarker) {
    const hookContent = await readText(hookAt);
    if (hookContent !== null && hookContent.includes("LEFTHOOK")) {
      return { kind: "lefthook", hooksPath, hookFile: join(repoRoot, ".lefthook-local.yml") };
    }
  }
  if (hooksPath) {
    return { kind: "block", hooksPath, hookFile: hookAt };
  }
  if (await fileExists(fallback)) {
    return { kind: "block", hooksPath: null, hookFile: fallback };
  }
  return { kind: "none", hooksPath: null, hookFile: fallback };
}

interface BlockWritePlan {
  changed: boolean;
  refused: boolean;
  backupPath: string | null;
  mode: number;
  notes: string[];
  content: Buffer | null;
}

function formatMode(mode: number): string {
  return (mode & 0o777).toString(8).padStart(4, "0");
}

function withExecBit(mode: number, notes: string[]): number {
  if ((mode & 0o111) !== 0) return mode;
  notes.push(`hook file was not executable (mode ${formatMode(mode)}); mode set to 0755`);
  return DEFAULT_HOOK_MODE;
}

function unchangedPlan(mode: number | null, notes: string[]): BlockWritePlan {
  return {
    changed: false,
    refused: false,
    backupPath: null,
    mode: mode ?? DEFAULT_HOOK_MODE,
    notes,
    content: null,
  };
}

async function planBlockWrite(
  worktreeRoot: string,
  filePath: string,
  block: string,
): Promise<BlockWritePlan> {
  const payload = Buffer.from(`${block}\n`, "utf-8");
  const existing = await readBytes(filePath);
  const mode = await fileMode(filePath);

  if (existing === null) {
    return {
      changed: true,
      refused: false,
      backupPath: null,
      mode: DEFAULT_HOOK_MODE,
      notes: ["created hook file"],
      content: Buffer.concat([SHEBANG_BYTES, payload]),
    };
  }

  const text = existing.toString("utf-8");
  if (text.includes(HOOK_START)) {
    const region = findRegion(existing);
    if (region === null) {
      return unchangedPlan(mode, ["superskill block already installed"]);
    }
    if (!region.terminated) {
      return {
        changed: false,
        refused: true,
        backupPath: null,
        mode: mode ?? DEFAULT_HOOK_MODE,
        notes: ["unterminated superskill block; manual fix required"],
        content: null,
      };
    }
    const content = Buffer.concat([
      existing.subarray(0, region.start),
      payload,
      existing.subarray(region.end),
    ]);
    if (content.equals(existing)) {
      return unchangedPlan(mode, ["superskill block already installed"]);
    }
    return {
      changed: true,
      refused: false,
      backupPath: null,
      mode: mode ?? DEFAULT_HOOK_MODE,
      notes: ["updated superskill block"],
      content,
    };
  }

  const notes: string[] = [];
  if (text.trim().length === 0) {
    notes.push(existing.length === 0 ? "created hook file" : "replaced whitespace-only hook file");
    const finalMode = mode === null ? DEFAULT_HOOK_MODE : withExecBit(mode, notes);
    return {
      changed: true,
      refused: false,
      backupPath: null,
      mode: finalMode,
      notes,
      content: Buffer.concat([SHEBANG_BYTES, payload]),
    };
  }

  const base = text.endsWith("\n") ? existing : Buffer.concat([existing, NEWLINE_BYTES]);
  const finalMode = mode === null ? DEFAULT_HOOK_MODE : withExecBit(mode, notes);
  notes.push("existing hook preserved; superskill block appended");
  const backupPath = join(
    await repoStateDir(worktreeRoot),
    "hooks",
    `${basename(filePath)}.superskill.bak`,
  );
  return {
    changed: true,
    refused: false,
    backupPath,
    mode: finalMode,
    notes,
    content: Buffer.concat([base, payload]),
  };
}

async function commitBlockWrite(filePath: string, plan: BlockWritePlan): Promise<void> {
  if (!plan.changed || plan.content === null) return;
  if (plan.backupPath !== null && !(await fileExists(plan.backupPath))) {
    await mkdir(dirname(plan.backupPath), { recursive: true });
    await copyFile(filePath, plan.backupPath);
  }
  await atomicWrite(filePath, plan.content, plan.mode);
}

function lefthookBody(cli: string | null): string {
  const bin = cli === null ? "superskill-cli" : shellQuote(cli);
  const guard = cli === null ? "command -v superskill-cli >/dev/null 2>&1" : `[ -x ${shellQuote(cli)} ]`;
  return [
    "post-checkout:",
    "  commands:",
    "    superskill-bootstrap:",
    "      run: |",
    `        if [ "$3" = "1" ] && printf '%s' "$1" | grep -Eq '^0+$'; then`,
    `          ${guard} && ${bootstrapRun(bin)}`,
    "        fi",
    "        true",
  ].join("\n");
}

function lefthookFile(cli: string | null, fingerprint: string): string {
  return [`${HOOK_START} fingerprint: ${fingerprint}`, lefthookBody(cli), `${HOOK_END}`].join("\n") + "\n";
}

export async function installPostCheckoutHook(
  worktreeRoot: string,
  opts: { dryRun?: boolean; cliPath?: string | null } = {},
): Promise<HookInstallResult> {
  const dryRun = opts.dryRun === true;
  const cli = normalizeCliPath(opts.cliPath);
  const fingerprint = fingerprintFor(cli);
  const info = await detectHookManager(worktreeRoot);

  if (info.kind === "precommit") {
    return {
      changed: false,
      kind: "precommit",
      hookFile: info.hookFile,
      backupPath: null,
      fingerprint,
      notes: [
        "manual pre-commit integration required: .pre-commit-config.yaml is user-owned and is never rewritten (v1 limitation)",
      ],
    };
  }

  if (info.kind === "lefthook") {
    const notes: string[] = [];
    if (await fileExists(info.hookFile)) {
      notes.push(
        "existing .lefthook-local.yml left untouched; add the superskill post-checkout command manually if needed",
      );
      return { changed: false, kind: "lefthook", hookFile: info.hookFile, backupPath: null, fingerprint, notes };
    }
    const content = Buffer.from(lefthookFile(cli, fingerprint), "utf-8");
    if (!dryRun) {
      await atomicWrite(info.hookFile, content, 0o644);
      await writeHookState(worktreeRoot, {
        v: HOOK_STATE_VERSION,
        kind: "lefthook",
        fingerprint,
        backupPath: null,
        installedAt: new Date().toISOString(),
      });
    }
    notes.push("created .lefthook-local.yml with a post-checkout bootstrap command");
    return { changed: true, kind: "lefthook", hookFile: info.hookFile, backupPath: null, fingerprint, notes };
  }

  const kind: "block" | "husky" = info.kind === "husky" ? "husky" : "block";
  const block = hookBlock(fingerprint, cli);
  const plan = await planBlockWrite(worktreeRoot, info.hookFile, block);
  const notes = [...plan.notes];
  if (plan.refused) {
    return {
      changed: false,
      kind,
      hookFile: info.hookFile,
      backupPath: null,
      fingerprint,
      notes,
    };
  }
  if (dryRun) notes.push("dry-run: no hook changes written");
  else await commitBlockWrite(info.hookFile, plan);
  if (!dryRun) {
    await writeHookState(worktreeRoot, {
      v: HOOK_STATE_VERSION,
      kind,
      fingerprint,
      backupPath: plan.backupPath,
      installedAt: new Date().toISOString(),
    });
  }
  return {
    changed: plan.changed,
    kind,
    hookFile: info.hookFile,
    backupPath: plan.backupPath,
    fingerprint,
    notes,
  };
}

interface BlockRemoval {
  removed: boolean;
  restored: boolean;
  notes: string[];
}

async function restorableBackupPath(
  worktreeRoot: string,
  filePath: string,
  state: HookState | null,
): Promise<string | null> {
  const recorded = state?.backupPath ?? null;
  if (recorded !== null && (await fileExists(recorded))) return recorded;
  const deterministic = join(
    await repoStateDir(worktreeRoot),
    "hooks",
    `${basename(filePath)}.superskill.bak`,
  );
  if (await fileExists(deterministic)) return deterministic;
  return null;
}

async function restoreBackupBytes(backupPath: string, filePath: string): Promise<boolean> {
  try {
    await copyFile(backupPath, filePath);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    console.error(
      `[worktree-hooks] cannot restore ${filePath} from ${backupPath}: ${code ?? String(err)}`,
    );
    return false;
  }
}

async function removeBlockLike(
  worktreeRoot: string,
  filePath: string,
  state: HookState | null,
): Promise<BlockRemoval> {
  const notes: string[] = [];
  const existing = await readBytes(filePath);
  if (existing === null) return { removed: false, restored: false, notes: ["hook file not found"] };
  if (!existing.toString("utf-8").includes(HOOK_START)) {
    return { removed: false, restored: false, notes: ["no superskill hook block found"] };
  }
  const region = findRegion(existing);
  if (region === null) {
    return { removed: false, restored: false, notes: ["no superskill hook block found"] };
  }
  if (!region.terminated) {
    return {
      removed: false,
      restored: false,
      notes: ["unterminated superskill block; manual fix required"],
    };
  }
  const remaining = Buffer.concat([existing.subarray(0, region.start), existing.subarray(region.end)]);
  const mode = (await fileMode(filePath)) ?? DEFAULT_HOOK_MODE;
  const removable = /^(#![^\n]*\n?)?\s*$/.test(remaining.toString("utf-8"));

  if (!removable) {
    await atomicWrite(filePath, remaining, mode);
    notes.push("removed superskill block; preserved surrounding hook content");
    return { removed: true, restored: false, notes };
  }

  const backupPath = await restorableBackupPath(worktreeRoot, filePath, state);
  if (backupPath !== null) {
    if (await restoreBackupBytes(backupPath, filePath)) {
      notes.push("restored backup of pre-existing hook");
      return { removed: true, restored: true, notes };
    }
    await atomicWrite(filePath, remaining, mode);
    notes.push("backup could not be restored; kept stripped hook file");
    return { removed: true, restored: false, notes };
  }

  if (state !== null && MANAGED_HOOK_KINDS.has(state.kind)) {
    await rm(filePath, { force: true });
    notes.push("removed hook file created by superskill");
    return { removed: true, restored: false, notes };
  }

  await atomicWrite(filePath, remaining, mode);
  notes.push("hook state missing or corrupt: stripped superskill block and kept the hook file");
  return { removed: true, restored: false, notes };
}

async function removeLefthookBlock(
  worktreeRoot: string,
  info: HookManagerInfo,
  state: HookState | null,
): Promise<BlockRemoval> {
  const repoRoot = (await gitTopLevel(worktreeRoot)) ?? worktreeRoot;
  const filePath = info.kind === "lefthook" ? info.hookFile : join(repoRoot, ".lefthook-local.yml");
  const existing = await readBytes(filePath);
  if (existing === null || !existing.toString("utf-8").includes(HOOK_START)) {
    return { removed: false, restored: false, notes: ["no superskill block found in .lefthook-local.yml"] };
  }
  const region = findRegion(existing);
  if (region === null) {
    return { removed: false, restored: false, notes: ["no superskill block found in .lefthook-local.yml"] };
  }
  if (!region.terminated) {
    return {
      removed: false,
      restored: false,
      notes: ["unterminated superskill block; manual fix required"],
    };
  }
  const remaining = Buffer.concat([existing.subarray(0, region.start), existing.subarray(region.end)]);
  const mode = (await fileMode(filePath)) ?? 0o644;

  if (remaining.toString("utf-8").trim().length > 0) {
    await atomicWrite(filePath, remaining, mode);
    return { removed: true, restored: false, notes: ["removed superskill block from .lefthook-local.yml"] };
  }

  const backupPath = await restorableBackupPath(worktreeRoot, filePath, state);
  if (backupPath !== null) {
    if (await restoreBackupBytes(backupPath, filePath)) {
      return { removed: true, restored: true, notes: ["restored backup of pre-existing .lefthook-local.yml"] };
    }
    await atomicWrite(filePath, remaining, mode);
    return { removed: true, restored: false, notes: ["backup could not be restored; kept stripped .lefthook-local.yml"] };
  }

  if (state !== null && MANAGED_HOOK_KINDS.has(state.kind)) {
    await rm(filePath, { force: true });
    return { removed: true, restored: false, notes: ["removed .lefthook-local.yml created by superskill"] };
  }

  await atomicWrite(filePath, remaining, mode);
  return {
    removed: true,
    restored: false,
    notes: ["hook state missing or corrupt: stripped superskill block and kept .lefthook-local.yml"],
  };
}

async function managedHookFile(worktreeRoot: string, kind: string, info: HookManagerInfo): Promise<string> {
  if (kind === "husky") {
    const repoRoot = (await gitTopLevel(worktreeRoot)) ?? worktreeRoot;
    return join(repoRoot, ".husky", "post-checkout");
  }
  if (info.kind === "block") return info.hookFile;
  return postCheckoutPath(worktreeRoot);
}

export async function uninstallPostCheckoutHook(worktreeRoot: string): Promise<HookUninstallResult> {
  const state = await readHookState(worktreeRoot);
  const info = await detectHookManager(worktreeRoot);
  const kind: "block" | "husky" | "lefthook" | "precommit" =
    state?.kind ?? (info.kind === "none" ? "block" : info.kind);
  const notes: string[] = [];
  let removed = false;
  let restored = false;

  if (kind === "precommit") {
    notes.push("manual pre-commit integration: nothing installed by superskill to remove");
  } else if (kind === "lefthook") {
    const outcome = await removeLefthookBlock(worktreeRoot, info, state);
    removed = outcome.removed;
    restored = outcome.restored;
    notes.push(...outcome.notes);
  } else {
    const filePath = await managedHookFile(worktreeRoot, kind, info);
    const outcome = await removeBlockLike(worktreeRoot, filePath, state);
    removed = outcome.removed;
    restored = outcome.restored;
    notes.push(...outcome.notes);
  }

  await clearHookState(worktreeRoot);
  return { removed, restored, notes };
}

export async function isHookInstalled(worktreeRoot: string): Promise<boolean> {
  const info = await detectHookManager(worktreeRoot);
  if (info.kind === "precommit") return false;
  if (info.kind === "lefthook") {
    const content = await readText(info.hookFile);
    return content !== null && content.includes(HOOK_START);
  }
  const content = await readText(info.hookFile);
  if (content !== null && content.includes(HOOK_START)) return true;
  if (info.kind === "block" && info.hooksPath === null) {
    const fallback = await postCheckoutPath(worktreeRoot);
    if (fallback !== info.hookFile) {
      const fallbackContent = await readText(fallback);
      return fallbackContent !== null && fallbackContent.includes(HOOK_START);
    }
  }
  return false;
}
