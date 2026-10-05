// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

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

export interface RepoIdentity {
  repoId: string;
  remoteHash: string | null;
  commonDir: string | null;
  topLevel: string | null;
}

export async function resolveRepoIdentity(worktreeRoot: string): Promise<RepoIdentity> {
  const [commonDir, topLevel, remote] = await Promise.all([
    gitCommonDir(worktreeRoot),
    gitTopLevel(worktreeRoot),
    gitRemoteUrl(worktreeRoot),
  ]);
  const remoteHash = remote ? hashId(normalizeRemote(remote)) : null;
  const fallbackSource = commonDir ?? topLevel ?? resolve(worktreeRoot);
  let fallback = fallbackSource;
  try {
    const { realpath } = await import("node:fs/promises");
    fallback = await realpath(fallbackSource);
  } catch {
    fallback = fallbackSource;
  }
  return {
    repoId: remoteHash ?? hashId(fallback),
    remoteHash,
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
