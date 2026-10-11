// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir, platform } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { mkdir, realpath, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

export const STATE_DIR_NAME = "superskill";
export const CACHE_APP_NAME = "superskill";

export function platformCacheRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.SUPERSKILL_CACHE_ROOT?.trim();
  if (override) return resolve(override);
  if (platform() === "darwin") return resolve(homedir(), "Library", "Caches", CACHE_APP_NAME);
  if (platform() === "win32") {
    const local = env.LOCALAPPDATA?.trim();
    return resolve(local ? local : join(homedir(), "AppData", "Local"), CACHE_APP_NAME);
  }
  const xdg = env.XDG_CACHE_HOME?.trim();
  return resolve(xdg ? xdg : join(homedir(), ".cache"), CACHE_APP_NAME);
}

export function hashId(input: string, length = 16): string {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}

async function gitOutput(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, timeout: 3000 });
    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string | null };
    if (error.code !== "ENOENT") {
      const detail =
        error.killed === true ? (error.signal ?? "killed") : (error.code ?? String(err));
      console.error(`[worktree-paths] git ${args[0] ?? ""} failed in ${cwd}: ${detail}`);
    }
    return null;
  }
}

export async function gitCommonDir(cwd: string): Promise<string | null> {
  return gitOutput(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
}

export async function gitTopLevel(cwd: string): Promise<string | null> {
  return gitOutput(cwd, ["rev-parse", "--show-toplevel"]);
}

export async function gitRemoteUrl(cwd: string): Promise<string | null> {
  return gitOutput(cwd, ["config", "--get", "remote.origin.url"]);
}

function stripRemoteSuffix(value: string): string {
  return value
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

function remoteFromUrl(value: string): string {
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port.length > 0 ? `:${parsed.port}` : "";
  return stripRemoteSuffix(`${host}${port}${parsed.pathname}`);
}

function conservativeRemote(value: string): string {
  const cleaned = stripRemoteSuffix(value);
  const match = cleaned.match(
    /^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/\s]+@)?(\[[^\]\s]+\]|[^@/\s:]+)/i,
  );
  if (!match) return cleaned;
  const host = match[1];
  const lowered = host.toLowerCase();
  if (host === lowered) return cleaned;
  const start = match[0].length - host.length;
  return `${cleaned.slice(0, start)}${lowered}${cleaned.slice(start + host.length)}`;
}

export function normalizeRemote(url: string): string {
  const value = url.trim();
  const scp = value.match(/^[^@/\s]+@([^:/\s[\]]+):(.+)$/);
  if (scp) {
    try {
      return remoteFromUrl(`ssh://${scp[1]}/${scp[2]}`);
    } catch {
      return conservativeRemote(value);
    }
  }
  try {
    return remoteFromUrl(value);
  } catch {
    return conservativeRemote(value);
  }
}

export function localRemotePath(remote: string): string | null {
  const value = remote.trim();
  if (value.length === 0) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    if (!/^file:\/\//i.test(value)) return null;
    try {
      return fileURLToPath(value);
    } catch {
      return null;
    }
  }
  if (/^[^@/\s]+@[^:/\s[\]]+:/.test(value)) return null;
  return value;
}

async function realpathOrNull(path: string): Promise<string | null> {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES" && code !== "ENOTDIR") {
      console.error(`[worktree-paths] cannot stat ${path}: ${code ?? String(err)}`);
    }
    return false;
  }
}

const LOCAL_REMOTE_MAX_DEPTH = 8;

function expandLocalPath(localPath: string, fromDir: string): string {
  const expanded = localPath.startsWith("~/") ? join(homedir(), localPath.slice(2)) : localPath;
  return isAbsolute(expanded) ? expanded : resolve(fromDir, expanded);
}

async function resolveLocalRemoteHash(
  localPath: string,
  worktreeRoot: string,
): Promise<string> {
  let current = (await realpathOrNull(expandLocalPath(localPath, worktreeRoot)))
    ?? expandLocalPath(localPath, worktreeRoot);
  const seen = new Set<string>();
  for (let depth = 0; depth < LOCAL_REMOTE_MAX_DEPTH; depth += 1) {
    if (seen.has(current) || !(await exists(current))) break;
    seen.add(current);
    const nestedRemote = await gitRemoteUrl(current);
    if (nestedRemote === null) break;
    const nestedLocal = localRemotePath(nestedRemote);
    if (nestedLocal === null) return hashId(normalizeRemote(nestedRemote));
    const next = expandLocalPath(nestedLocal, current);
    current = (await realpathOrNull(next)) ?? next;
  }
  if (await exists(current)) {
    const nestedCommon = await gitCommonDir(current);
    if (nestedCommon !== null) {
      return hashId((await realpathOrNull(nestedCommon)) ?? nestedCommon);
    }
  }
  return hashId(current);
}

export interface RepoIdentity {
  repoId: string;
  remoteHash: string | null;
  legacyRepoId: string | null;
  commonDir: string | null;
  topLevel: string | null;
}

export async function resolveRepoIdentity(worktreeRoot: string): Promise<RepoIdentity> {
  const [commonDir, topLevel, remote] = await Promise.all([
    gitCommonDir(worktreeRoot),
    gitTopLevel(worktreeRoot),
    gitRemoteUrl(worktreeRoot),
  ]);
  let remoteHash: string | null = null;
  let legacyRepoId: string | null = null;
  if (remote) {
    const localPath = localRemotePath(remote);
    if (localPath === null) {
      remoteHash = hashId(normalizeRemote(remote));
    } else {
      remoteHash = await resolveLocalRemoteHash(localPath, worktreeRoot);
      const legacy = hashId(normalizeRemote(remote));
      if (legacy !== remoteHash) legacyRepoId = legacy;
    }
  }
  const fallbackSource = commonDir ?? topLevel ?? resolve(worktreeRoot);
  const fallback = (await realpathOrNull(fallbackSource)) ?? fallbackSource;
  return {
    repoId: remoteHash ?? hashId(fallback),
    remoteHash,
    legacyRepoId,
    commonDir,
    topLevel: topLevel ?? worktreeRoot,
  };
}

export async function repoStateDir(worktreeRoot: string): Promise<string> {
  const common = await gitCommonDir(worktreeRoot);
  if (common) return join(common, STATE_DIR_NAME);
  const top = (await gitTopLevel(worktreeRoot)) ?? worktreeRoot;
  return join(top, ".git", STATE_DIR_NAME);
}

export function cacheNamespace(repoId: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(platformCacheRoot(env), repoId);
}

export function worktreeKey(worktreePath: string): string {
  return hashId(resolve(worktreePath));
}

export async function ensureCacheDir(path: string): Promise<string> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  return path;
}
