// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { gitCommonDir, gitTopLevel, hashId, repoStateDir } from "./paths.js";
import { clearHookState, readHookState, writeHookState, type HookState } from "./state.js";
import { unsafePathReason } from "./host-adapters/helpers.js";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 5000;
const HOOK_STATE_VERSION = 1;
const DEFAULT_HOOK_MODE = 0o755;
const MANAGED_HOOK_KINDS = new Set<HookState["kind"]>(["block", "husky", "lefthook"]);

type OwnedHookState = HookState & { hookFile?: string; created?: boolean; blockHash?: string };

async function hookPathReason(worktreeRoot: string, path: string): Promise<string | null> {
  const repoRoot = await gitTopLevel(worktreeRoot);
  if (repoRoot === null) return "not a git repository; hook left unchanged";
  const common = await gitCommonDir(worktreeRoot);
  const roots = [worktreeRoot, repoRoot, ...(common === null ? [] : [common])];
  for (const root of roots) {
    const rel = relative(resolve(root), resolve(path));
    if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) continue;
    if ((await lstat(root)).isSymbolicLink()) return `symlink hook directory left unchanged: ${root}`;
    return unsafePathReason(path, root);
  }
  return `hook path outside trusted repository/git directories; left unchanged: ${path}`;
}

async function requireHookPath(worktreeRoot: string, path: string): Promise<void> {
  const reason = await hookPathReason(worktreeRoot, path);
  if (reason !== null) throw new Error(reason);
}

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
    return await readFile(path, { flag: constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-hooks] cannot read ${path}: ${code ?? String(err)}`);
      throw err;
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

async function atomicWrite(worktreeRoot: string, filePath: string, content: Buffer, mode: number, expected?: Buffer | null): Promise<void> {
  await requireHookPath(worktreeRoot, filePath);
  const before = expected === undefined ? await readBytes(filePath) : expected;
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await requireHookPath(worktreeRoot, filePath);
  const tmpPath = join(dir, `.${basename(filePath)}.tmp-${randomUUID()}`);
  try {
    await writeFile(tmpPath, content, { mode: 0o600, flag: "wx" });
    await chmod(tmpPath, mode);
    await requireHookPath(worktreeRoot, filePath);
    const current = await readBytes(filePath);
    if (before === null ? current !== null : current === null || !before.equals(current)) {
      throw new Error(`${filePath} changed during write; left unchanged`);
    }
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
  let start = content.indexOf(HOOK_START_BYTES);
  while (start > 0 && content[start - 1] !== 0x0a) start = content.indexOf(HOOK_START_BYTES, start + HOOK_START_BYTES.length);
  if (start === -1) return null;
  let endMarker = content.indexOf(HOOK_END_BYTES, start + HOOK_START_BYTES.length);
  while (endMarker > 0 && content[endMarker - 1] !== 0x0a) endMarker = content.indexOf(HOOK_END_BYTES, endMarker + HOOK_END_BYTES.length);
  if (endMarker === -1) return { start, end: content.length, terminated: false };
  const after = endMarker + HOOK_END_BYTES.length;
  if (after < content.length && content[after] !== 0x0a) return { start, end: content.length, terminated: false };
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

  if (resolvedHooksDir === join(repoRoot, ".husky") || resolvedHooksDir === join(repoRoot, ".husky", "_")) {
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
    if (!regionOwned(existing, region, null)) {
      return { ...unchangedPlan(mode, ["modified or unrecognized superskill hook block; left unchanged"]), refused: true };
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

async function commitBlockWrite(worktreeRoot: string, filePath: string, plan: BlockWritePlan, before: Buffer | null): Promise<void> {
  if (!plan.changed || plan.content === null) return;
  await requireHookPath(worktreeRoot, filePath);
  const current = await readBytes(filePath);
  if (before === null ? current !== null : current === null || !before.equals(current)) {
    throw new Error("hook changed during installation; left unchanged");
  }
  if (plan.backupPath !== null) {
    await requireHookPath(worktreeRoot, plan.backupPath);
    if (!(await fileExists(plan.backupPath))) {
      await mkdir(dirname(plan.backupPath), { recursive: true, mode: 0o700 });
      await writeFile(plan.backupPath, before as Buffer, { flag: "wx", mode: 0o600 });
    }
  }
  await atomicWrite(worktreeRoot, filePath, plan.content, plan.mode, before);
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
  const stateFile = join(await repoStateDir(worktreeRoot), "hook.state");
  const unsafe = await hookPathReason(worktreeRoot, info.hookFile) ?? await hookPathReason(worktreeRoot, stateFile);
  if (unsafe !== null) {
    return { changed: false, kind: info.kind, hookFile: info.hookFile, backupPath: null, fingerprint, notes: [unsafe] };
  }

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
      await atomicWrite(worktreeRoot, info.hookFile, content, 0o644, null);
      const state: OwnedHookState = {
        v: HOOK_STATE_VERSION,
        kind: "lefthook",
        fingerprint,
        backupPath: null,
        installedAt: new Date().toISOString(),
        hookFile: info.hookFile,
        created: true,
        blockHash: hashId(content.toString("utf-8"), 64),
      };
      await writeHookState(worktreeRoot, state);
    }
    notes.push("created .lefthook-local.yml with a post-checkout bootstrap command");
    return { changed: true, kind: "lefthook", hookFile: info.hookFile, backupPath: null, fingerprint, notes };
  }

  const kind: "block" | "husky" = info.kind === "husky" ? "husky" : "block";
  const block = hookBlock(fingerprint, cli);
  const before = await readBytes(info.hookFile);
  const previous = await readHookState(worktreeRoot) as OwnedHookState | null;
  const previousRegion = before === null ? null : findRegion(before);
  const wasManaged = previous?.hookFile === info.hookFile && previousRegion?.terminated === true;
  if (before !== null && previousRegion?.terminated && previous?.hookFile === info.hookFile &&
    previous.blockHash && hashId(before.subarray(previousRegion.start, previousRegion.end).toString("utf-8"), 64) !== previous.blockHash) {
    return { changed: false, kind, hookFile: info.hookFile, backupPath: null, fingerprint, notes: ["modified superskill hook block; left unchanged"] };
  }
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
  else await commitBlockWrite(worktreeRoot, info.hookFile, plan, before);
  if (!dryRun) {
    const state: OwnedHookState = {
      v: HOOK_STATE_VERSION,
      kind,
      fingerprint,
      backupPath: plan.backupPath ?? (previous?.hookFile === info.hookFile ? previous.backupPath : null),
      installedAt: new Date().toISOString(),
      hookFile: info.hookFile,
      created: wasManaged ? previous?.created : before === null,
      blockHash: hashId(`${block}\n`, 64),
    };
    await writeHookState(worktreeRoot, state);
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
  const deterministic = join(
    await repoStateDir(worktreeRoot),
    "hooks",
    `${basename(filePath)}.superskill.bak`,
  );
  const recorded = state?.backupPath;
  if (recorded != null && (typeof recorded !== "string" || resolve(recorded) !== resolve(deterministic))) return null;
  if (await hookPathReason(worktreeRoot, deterministic) !== null) return null;
  if (await fileExists(deterministic)) return deterministic;
  return null;
}

async function restoreBackupBytes(worktreeRoot: string, backupPath: string, filePath: string, remaining: Buffer, mode: number, expected: Buffer): Promise<boolean> {
  try {
    const backup = await readBytes(backupPath);
    if (backup === null || (!backup.equals(remaining) && !Buffer.concat([backup, NEWLINE_BYTES]).equals(remaining))) return false;
    await atomicWrite(worktreeRoot, filePath, backup, mode, expected);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    console.error(
      `[worktree-hooks] cannot restore ${filePath} from ${backupPath}: ${code ?? String(err)}`,
    );
    return false;
  }
}

function regionOwned(existing: Buffer, region: BlockRegion, state: HookState | null, lefthook = false): boolean {
  const content = existing.subarray(region.start, region.end).toString("utf-8");
  const recordedHash = (state as OwnedHookState | null)?.blockHash;
  if (recordedHash) return hashId(content, 64) === recordedHash;
  if (lefthook) return false;
  const firstNewline = content.indexOf("\n");
  const header = content.slice(0, firstNewline);
  const fingerprint = header.match(/^# >>> superskill worktree-start fingerprint: ([a-f0-9]{12})$/)?.[1];
  const end = content.lastIndexOf(`\n${HOOK_END}`);
  return fingerprint !== undefined && end > firstNewline && hashId(content.slice(firstNewline + 1, end), 12) === fingerprint;
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
  if (!regionOwned(existing, region, state)) {
    return { removed: false, restored: false, notes: ["modified or unrecognized superskill hook block; left unchanged"] };
  }
  const remaining = Buffer.concat([existing.subarray(0, region.start), existing.subarray(region.end)]);
  const mode = (await fileMode(filePath)) ?? DEFAULT_HOOK_MODE;
  const removable = /^(#![^\n]*\n?)?\s*$/.test(remaining.toString("utf-8"));

  if (!removable) {
    const backupPath = await restorableBackupPath(worktreeRoot, filePath, state);
    const backup = backupPath === null ? null : await readBytes(backupPath);
    if (backup !== null && !backup.equals(remaining) && Buffer.concat([backup, NEWLINE_BYTES]).equals(remaining) &&
      await restoreBackupBytes(worktreeRoot, backupPath!, filePath, remaining, mode, existing)) {
      return { removed: true, restored: true, notes: ["restored matching pre-existing hook bytes"] };
    }
    await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
    notes.push("removed superskill block; preserved surrounding hook content");
    return { removed: true, restored: false, notes };
  }

  const backupPath = await restorableBackupPath(worktreeRoot, filePath, state);
  if (backupPath !== null) {
    if (await restoreBackupBytes(worktreeRoot, backupPath, filePath, remaining, mode, existing)) {
      notes.push("restored backup of pre-existing hook");
      return { removed: true, restored: true, notes };
    }
    await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
    notes.push("backup could not be restored or did not match remaining content; kept stripped hook file");
    return { removed: true, restored: false, notes };
  }

  if (state !== null && MANAGED_HOOK_KINDS.has(state.kind) && (state as OwnedHookState).created === true &&
    remaining.equals(SHEBANG_BYTES)) {
    await requireHookPath(worktreeRoot, filePath);
    if (!(await readBytes(filePath))?.equals(existing)) throw new Error(`${filePath} changed during uninstall; left unchanged`);
    await rm(filePath, { force: true });
    notes.push("removed hook file created by superskill");
    return { removed: true, restored: false, notes };
  }

  await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
  notes.push("hook state missing or corrupt: stripped superskill block and kept the hook file");
  return { removed: true, restored: false, notes };
}

async function removeLefthookBlock(
  worktreeRoot: string,
  info: HookManagerInfo,
  state: HookState | null,
): Promise<BlockRemoval> {
  const repoRoot = (await gitTopLevel(worktreeRoot)) ?? worktreeRoot;
  const filePath = (state as OwnedHookState | null)?.hookFile ?? (info.kind === "lefthook" ? info.hookFile : join(repoRoot, ".lefthook-local.yml"));
  await requireHookPath(worktreeRoot, filePath);
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
  if (!regionOwned(existing, region, state, true)) {
    return { removed: false, restored: false, notes: ["modified or unrecognized superskill lefthook block; left unchanged"] };
  }
  const remaining = Buffer.concat([existing.subarray(0, region.start), existing.subarray(region.end)]);
  const mode = (await fileMode(filePath)) ?? 0o644;

  if (remaining.toString("utf-8").trim().length > 0) {
    await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
    return { removed: true, restored: false, notes: ["removed superskill block from .lefthook-local.yml"] };
  }

  const backupPath = await restorableBackupPath(worktreeRoot, filePath, state);
  if (backupPath !== null) {
    if (await restoreBackupBytes(worktreeRoot, backupPath, filePath, remaining, mode, existing)) {
      return { removed: true, restored: true, notes: ["restored backup of pre-existing .lefthook-local.yml"] };
    }
    await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
    return { removed: true, restored: false, notes: ["backup could not be restored; kept stripped .lefthook-local.yml"] };
  }

  if (state !== null && MANAGED_HOOK_KINDS.has(state.kind) && (state as OwnedHookState).created === true && remaining.length === 0) {
    await requireHookPath(worktreeRoot, filePath);
    if (!(await readBytes(filePath))?.equals(existing)) throw new Error(`${filePath} changed during uninstall; left unchanged`);
    await rm(filePath, { force: true });
    return { removed: true, restored: false, notes: ["removed .lefthook-local.yml created by superskill"] };
  }

  await atomicWrite(worktreeRoot, filePath, remaining, mode, existing);
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
  const stateFile = join(await repoStateDir(worktreeRoot), "hook.state");
  const unsafeState = await hookPathReason(worktreeRoot, stateFile);
  if (unsafeState !== null) return { removed: false, restored: false, notes: [unsafeState] };
  const state = await readHookState(worktreeRoot) as OwnedHookState | null;
  const info = await detectHookManager(worktreeRoot);
  const filePath = state?.hookFile ?? (state?.kind === "lefthook" ? join((await gitTopLevel(worktreeRoot)) ?? worktreeRoot, ".lefthook-local.yml") : await managedHookFile(worktreeRoot, state?.kind ?? info.kind, info));
  if (typeof filePath !== "string") return { removed: false, restored: false, notes: ["invalid recorded hook target; left unchanged"] };
  const unsafe = await hookPathReason(worktreeRoot, filePath);
  if (unsafe !== null) return { removed: false, restored: false, notes: [unsafe] };
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
    const outcome = await removeBlockLike(worktreeRoot, filePath, state);
    removed = outcome.removed;
    restored = outcome.restored;
    notes.push(...outcome.notes);
  }

  if (removed && state !== null) {
    await requireHookPath(worktreeRoot, stateFile);
    await clearHookState(worktreeRoot);
  }
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
