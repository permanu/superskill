// SPDX-License-Identifier: Apache-2.0

import { appendFile, chmod, link, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ActivationEvent, TelemetrySettings } from "./types.js";

export interface TelemetryPaths {
  dir: string;
  settings: string;
  events: string;
  key: string;
}

export const MAX_EVENTS_BYTES = 5 * 1024 * 1024;
const processKey = randomBytes(32);
const taskDigests = new WeakMap<ActivationEvent, Buffer>();

export function telemetryPaths(home = homedir()): TelemetryPaths {
  const dir = join(home, ".superskill", "telemetry");
  return { dir, settings: join(dir, "settings.json"), events: join(dir, "events.jsonl"), key: join(dir, "task-key") };
}

async function ensurePrivateDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
}

async function tightenFilePermissions(path: string): Promise<void> {
  try {
    await chmod(path, 0o600);
  } catch (e) {
    console.error(`[telemetry] could not tighten permissions for ${path}:`, (e as Error).message);
  }
}

function envToggle(value: string | undefined): boolean | null {
  if (value === undefined || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

async function loadTelemetrySettings(paths: TelemetryPaths): Promise<TelemetrySettings | null> {
  try {
    const raw = await readFile(paths.settings, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TelemetrySettings> | null;
    if (typeof parsed?.enabled === "boolean") {
      return {
        enabled: parsed.enabled,
        updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null,
      };
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    console.error("[telemetry] cannot read settings:", code ?? "invalid settings");
  }
  return { enabled: false, updated_at: null };
}

export async function readTelemetrySettings(paths: TelemetryPaths = telemetryPaths()): Promise<TelemetrySettings> {
  return (await loadTelemetrySettings(paths)) ?? { enabled: false, updated_at: null };
}

export async function writeTelemetrySettings(
  enabled: boolean,
  paths: TelemetryPaths = telemetryPaths()
): Promise<TelemetrySettings> {
  const settings: TelemetrySettings = { enabled, updated_at: new Date().toISOString() };
  await ensurePrivateDir(paths.dir);
  const tmp = `${paths.settings}.tmp-${randomBytes(8).toString("hex")}`;
  await writeFile(tmp, `${JSON.stringify(settings, null, 2)}\n`, { encoding: "utf-8", mode: 0o600, flag: "wx" });
  await rename(tmp, paths.settings);
  await tightenFilePermissions(paths.settings);
  return settings;
}

export async function isTelemetryEnabled(
  paths: TelemetryPaths = telemetryPaths(),
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const override = envToggle(env.SUPERSKILL_TELEMETRY);
  if (override === false) return false;
  const settings = await loadTelemetrySettings(paths);
  if (settings?.enabled === false) return false;
  return override === true || settings?.enabled === true;
}

export function hashTask(prompt: string, key: Buffer = processKey): string {
  return keyedTaskDigest(createHash("sha256").update(prompt).digest(), key);
}

function keyedTaskDigest(digest: Buffer | string, key: Buffer): string {
  return `hmac-sha256:${createHmac("sha256", key).update(digest).digest("hex").slice(0, 32)}`;
}

async function taskKey(paths: TelemetryPaths): Promise<Buffer> {
  const tmp = `${paths.key}.tmp-${randomBytes(8).toString("hex")}`;
  try {
    await writeFile(tmp, randomBytes(32), { mode: 0o600, flag: "wx" });
    try { await link(tmp, paths.key); } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  } finally {
    await unlink(tmp).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") console.error(`[telemetry] key temp cleanup failed: ${err.code}`);
    });
  }
  const handle = await open(paths.key, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== 32) throw new Error("Invalid telemetry task key");
    await handle.chmod(0o600);
    const key = Buffer.alloc(32);
    let offset = 0;
    while (offset < key.length) {
      const { bytesRead } = await handle.read(key, offset, key.length - offset, offset);
      if (bytesRead === 0) throw new Error("Incomplete telemetry task key");
      offset += bytesRead;
    }
    return key;
  } finally { await handle.close(); }
}

export interface ActivationEventInput {
  tool?: string | null;
  project?: string | null;
  prompt: string;
  phase: string;
  stack: readonly string[];
  langs: readonly string[];
  budget: { allocated: number; used: number };
  selected: readonly string[];
  principles: readonly string[];
  dropped: readonly string[];
  rulesTotal: number;
}

export function buildActivationEvent(input: ActivationEventInput, now: Date = new Date()): ActivationEvent {
  const event: ActivationEvent = {
    v: 1,
    type: "activation",
    at: now.toISOString(),
    tool: input.tool ?? null,
    project: input.project ?? null,
    task_hash: hashTask(input.prompt),
    phase: input.phase,
    stack: [...input.stack],
    langs: [...input.langs],
    budget: { allocated: input.budget.allocated, used: input.budget.used },
    selected: [...input.selected],
    principles: [...input.principles],
    dropped: [...input.dropped],
    rules_total: input.rulesTotal,
  };
  taskDigests.set(event, createHash("sha256").update(input.prompt).digest());
  return event;
}

async function rotateIfNeeded(paths: TelemetryPaths, maxBytes: number): Promise<void> {
  try {
    const info = await stat(paths.events);
    if (info.size < maxBytes) return;
    await rename(paths.events, `${paths.events}.1`);
    await tightenFilePermissions(`${paths.events}.1`);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("[telemetry] rotate check failed:", (e as Error).message);
  }
}

/**
 * Append one event when telemetry is enabled. Never throws — a telemetry
 * failure must not break rule activation.
 */
export async function recordTelemetryEvent(
  event: ActivationEvent,
  paths: TelemetryPaths = telemetryPaths(),
  maxBytes: number = MAX_EVENTS_BYTES
): Promise<boolean> {
  try {
    if (!(await isTelemetryEnabled(paths))) return false;
    await ensurePrivateDir(paths.dir);
    const key = await taskKey(paths);
    const privateEvent = { ...event, task_hash: keyedTaskDigest(taskDigests.get(event) ?? event.task_hash, key) };
    await rotateIfNeeded(paths, maxBytes);
    await appendFile(paths.events, `${JSON.stringify(privateEvent)}\n`, { encoding: "utf-8", mode: 0o600 });
    await tightenFilePermissions(paths.events);
    return true;
  } catch (e) {
    console.error("[telemetry] record failed:", (e as Error).message);
    return false;
  }
}
