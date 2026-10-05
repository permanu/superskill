// SPDX-License-Identifier: Apache-2.0

import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ActivationEvent, TelemetrySettings } from "./types.js";

export interface TelemetryPaths {
  dir: string;
  settings: string;
  events: string;
}

export const MAX_EVENTS_BYTES = 5 * 1024 * 1024;

export function telemetryPaths(home = homedir()): TelemetryPaths {
  const dir = join(home, ".superskill", "telemetry");
  return { dir, settings: join(dir, "settings.json"), events: join(dir, "events.jsonl") };
}

function envToggle(value: string | undefined): boolean | null {
  if (value === undefined || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export async function readTelemetrySettings(paths: TelemetryPaths = telemetryPaths()): Promise<TelemetrySettings> {
  try {
    const raw = await readFile(paths.settings, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TelemetrySettings>;
    if (typeof parsed.enabled === "boolean") {
      return {
        enabled: parsed.enabled,
        updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null,
      };
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("[telemetry] cannot read settings:", (e as Error).message);
  }
  return { enabled: false, updated_at: null };
}

export async function writeTelemetrySettings(
  enabled: boolean,
  paths: TelemetryPaths = telemetryPaths()
): Promise<TelemetrySettings> {
  const settings: TelemetrySettings = { enabled, updated_at: new Date().toISOString() };
  await mkdir(paths.dir, { recursive: true });
  const tmp = `${paths.settings}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  await rename(tmp, paths.settings);
  return settings;
}

/**
 * Whether telemetry is on. The `SUPERSKILL_TELEMETRY` environment variable
 * overrides the persisted setting (`1/true/yes/on` and `0/false/no/off`).
 * Disabled by default; nothing is ever written without an explicit opt-in.
 */
export async function isTelemetryEnabled(
  paths: TelemetryPaths = telemetryPaths(),
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const override = envToggle(env.SUPERSKILL_TELEMETRY);
  if (override !== null) return override;
  const settings = await readTelemetrySettings(paths);
  return settings.enabled;
}

/** Privacy-preserving prompt identity: `sha256:<16 hex>`; the prompt text is never stored. */
export function hashTask(prompt: string): string {
  return `sha256:${createHash("sha256").update(prompt).digest("hex").slice(0, 16)}`;
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
  return {
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
}

async function rotateIfNeeded(paths: TelemetryPaths, maxBytes: number): Promise<void> {
  try {
    const info = await stat(paths.events);
    if (info.size < maxBytes) return;
    await rename(paths.events, `${paths.events}.1`);
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
    await mkdir(paths.dir, { recursive: true });
    await rotateIfNeeded(paths, maxBytes);
    await appendFile(paths.events, `${JSON.stringify(event)}\n`, "utf-8");
    return true;
  } catch (e) {
    console.error("[telemetry] record failed:", (e as Error).message);
    return false;
  }
}
