// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { probeDirAge, probeDirSize } from "../../worktree/audit.js";
import { hashId } from "../../worktree/paths.js";
import { quoteShell } from "../shell.js";
import type {
  HygieneItem,
  HygieneProbe,
  HygieneProbeOptions,
  HygieneProbeResult,
} from "../types.js";

const execFileAsync = promisify(execFile);
const MS_PER_DAY = 86_400_000;
const SIMCTL_TIMEOUT_MS = 10_000;
const SIMCTL_MAX_BUFFER = 10 * 1024 * 1024;
const XCODE_LABEL = "Xcode";
const DERIVED_DATA_NOTE = "auto-generated build products; xcodebuild regenerates them";
const DEVICE_SUPPORT_NOTE = "only the newest DeviceSupport version is needed for current devices";

export type XcodeExec = (
  cmd: string,
  args: string[],
  opts: { timeout: number; maxBuffer: number },
) => Promise<{ stdout: string; stderr?: string }>;

export interface XcodeProbeDeps {
  exec?: XcodeExec;
  platform?: string;
  home?: string;
}

const defaultExec: XcodeExec = async (cmd, args, opts) => {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    timeout: opts.timeout,
    maxBuffer: opts.maxBuffer,
    encoding: "utf-8",
  });
  return { stdout, stderr };
};

export function parseDeviceSupportVersion(name: string): number[] | null {
  const match = name.match(/\d+(?:\.\d+)+/);
  if (match === null) return null;
  return match[0].split(".").map((part) => Number.parseInt(part, 10));
}

function formatVersion(parts: number[]): string {
  return parts.join(".");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function isIgnorableFsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "EACCES";
}

async function statIfExists(path: string) {
  try {
    return await stat(path);
  } catch (err) {
    if (isIgnorableFsError(err)) return null;
    throw err;
  }
}

function derivedDataReason(bytes: number | null, sizes: boolean): string {
  if (bytes !== null) return `${DERIVED_DATA_NOTE}; ${formatBytes(bytes)} on disk`;
  if (!sizes) return `${DERIVED_DATA_NOTE}; size not measured, re-run with --sizes to enable cleanup`;
  return `${DERIVED_DATA_NOTE}; size unavailable`;
}

async function probeDerivedData(
  xcodeHome: string,
  opts: HygieneProbeOptions,
): Promise<HygieneItem | null> {
  const path = join(xcodeHome, "DerivedData");
  const info = await statIfExists(path);
  if (info === null || !info.isDirectory()) return null;

  let bytes: number | null = null;
  let ageDays: number | null = null;
  if (opts.sizes) {
    [bytes, ageDays] = await Promise.all([probeDirSize(path), probeDirAge(path)]);
  } else {
    ageDays = Math.max(0, opts.now - info.mtimeMs) / MS_PER_DAY;
  }

  if (bytes !== null && bytes <= 0) return null;

  return {
    id: "xcode:derived-data",
    category: "xcode",
    title: "DerivedData",
    path,
    bytes,
    ageDays,
    tier: "auto",
    due: bytes !== null && bytes >= opts.policy.xcodeDerivedDataMinBytes,
    reason: derivedDataReason(bytes, opts.sizes),
    plan: `rm -rf ${quoteShell(path)}/*`,
    meta: { minBytes: opts.policy.xcodeDerivedDataMinBytes, measured: opts.sizes },
  };
}

interface DeviceSupportEntry {
  name: string;
  path: string;
  version: number[];
}

function compareVersions(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function maxDeviceSupportVersion(entries: DeviceSupportEntry[]): number[] {
  return entries.reduce((max, entry) => {
    const cmp = compareVersions(entry.version, max);
    return cmp > 0 ? entry.version : max;
  }, entries[0].version);
}

async function probeDeviceSupport(
  xcodeHome: string,
  opts: HygieneProbeOptions,
): Promise<HygieneItem[]> {
  const root = join(xcodeHome, "iOS DeviceSupport");
  const dirents = await readdir(root, { withFileTypes: true }).catch((err: unknown) => {
    if (isIgnorableFsError(err)) return null;
    throw err;
  });
  if (dirents === null) return [];

  const entries: DeviceSupportEntry[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    const version = parseDeviceSupportVersion(dirent.name);
    if (version === null) continue;
    entries.push({ name: dirent.name, path: join(root, dirent.name), version });
  }
  if (entries.length < 2) return [];

  const maxVersion = maxDeviceSupportVersion(entries);
  const newestNames = entries
    .filter((entry) => compareVersions(entry.version, maxVersion) === 0)
    .map((entry) => entry.name)
    .sort();
  const older = entries.filter((entry) => compareVersions(entry.version, maxVersion) < 0);

  return Promise.all(
    older.map(async (entry): Promise<HygieneItem> => {
      let bytes: number | null = null;
      let ageDays: number | null = null;
      if (opts.sizes) {
        [bytes, ageDays] = await Promise.all([probeDirSize(entry.path), probeDirAge(entry.path)]);
      }
      return {
        id: `xcode:device-support:${hashId(entry.name)}`,
        category: "xcode",
        title: `Legacy iOS DeviceSupport ${formatVersion(entry.version)}`,
        path: entry.path,
        bytes,
        ageDays,
        tier: "auto",
        due: true,
        reason: DEVICE_SUPPORT_NOTE,
        plan: `rm -rf ${quoteShell(entry.path)}`,
        meta: { version: formatVersion(entry.version), name: entry.name, newest: newestNames.join(", ") },
      };
    }),
  );
}

function countUnavailableDevices(payload: unknown): number {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("unexpected simctl payload");
  }
  const devices = (payload as { devices?: unknown }).devices;
  if (typeof devices !== "object" || devices === null || Array.isArray(devices)) {
    throw new Error("unexpected simctl payload: devices");
  }
  let count = 0;
  for (const runtime of Object.values(devices)) {
    if (!Array.isArray(runtime)) throw new Error("unexpected simctl payload: runtime devices");
    for (const device of runtime) {
      if (typeof device !== "object" || device === null) continue;
      if ((device as { isAvailable?: unknown }).isAvailable === false) count += 1;
    }
  }
  return count;
}

async function probeUnavailableSimulators(exec: XcodeExec): Promise<HygieneItem | null> {
  let stdout: string;
  try {
    ({ stdout } = await exec("xcrun", ["simctl", "list", "devices", "-j"], {
      timeout: SIMCTL_TIMEOUT_MS,
      maxBuffer: SIMCTL_MAX_BUFFER,
    }));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[hygiene-xcode] simctl list failed: ${code ?? String(err)}`);
    }
    return null;
  }

  let count: number;
  try {
    count = countUnavailableDevices(JSON.parse(stdout));
  } catch (err) {
    console.error(`[hygiene-xcode] cannot read simctl output: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  if (count === 0) return null;

  return {
    id: "xcode:simulators",
    category: "xcode",
    title: "Unavailable simulators",
    path: null,
    bytes: null,
    ageDays: null,
    tier: "auto",
    due: true,
    reason: `${count} device(s) in unavailable runtimes`,
    plan: "xcrun simctl delete unavailable",
    meta: { unavailableCount: count },
  };
}

export async function runXcodeProbe(
  opts: HygieneProbeOptions,
  deps: XcodeProbeDeps = {},
): Promise<HygieneProbeResult> {
  const platform = deps.platform ?? process.platform;
  if (platform !== "darwin") {
    return {
      category: "xcode",
      label: XCODE_LABEL,
      items: [],
      skipped: { probe: "xcode", reason: "xcode artifacts only exist on macOS" },
    };
  }

  const home = deps.home ?? homedir();
  const xcodeHome = join(home, "Library", "Developer", "Xcode");
  const exec = deps.exec ?? defaultExec;

  try {
    const [derivedData, deviceSupport, simulators] = await Promise.all([
      probeDerivedData(xcodeHome, opts),
      probeDeviceSupport(xcodeHome, opts),
      probeUnavailableSimulators(exec),
    ]);
    const items: HygieneItem[] = [];
    if (derivedData !== null) items.push(derivedData);
    items.push(...deviceSupport);
    if (simulators !== null) items.push(simulators);
    return { category: "xcode", label: XCODE_LABEL, items, skipped: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hygiene-xcode] probe failed: ${message}`);
    return {
      category: "xcode",
      label: XCODE_LABEL,
      items: [],
      skipped: { probe: "xcode", reason: `xcode probe failed: ${message}` },
    };
  }
}

export const xcodeProbe: HygieneProbe = {
  id: "xcode",
  run: (opts) => runXcodeProbe(opts),
};
