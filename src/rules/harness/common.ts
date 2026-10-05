// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HarnessResult } from "../types.js";

export const COMPILE_TIMEOUT_MS = 30_000;

const PROBE_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_CHARS = 64_000;

export interface RunResult {
  ok: boolean;
  missing: boolean;
  output: string;
}

export interface ToolInfo {
  available: boolean;
  compiler: string;
}

const toolCache = new Map<string, Promise<ToolInfo>>();

function firstLine(text: string): string {
  const line = text.split(/\r?\n/).find((candidate) => candidate.trim() !== "") ?? "";
  return line.trim().slice(0, 200);
}

export function probeTool(
  id: string,
  cmd: string,
  args: string[],
  format?: (output: string) => string,
): Promise<ToolInfo> {
  const cached = toolCache.get(id);
  if (cached) return cached;
  const probe = new Promise<ToolInfo>((resolve) => {
    execFile(cmd, args, { timeout: PROBE_TIMEOUT_MS }, (err, stdout, stderr) => {
      const raw = `${stdout ?? ""}${stderr ?? ""}`.trim();
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        resolve({ available: false, compiler: "skipped" });
        return;
      }
      const compiler = format ? format(raw) : firstLine(raw) || cmd;
      resolve({ available: true, compiler });
    });
  });
  toolCache.set(id, probe);
  return probe;
}

export function runProcess(
  cmd: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<RunResult> {
  const timeoutMs = options.timeoutMs ?? COMPILE_TIMEOUT_MS;
  const env = options.env ? { ...process.env, ...options.env } : undefined;
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { cwd: options.cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, env },
      (err, stdout, stderr) => {
        const output = `${stdout ?? ""}${stderr ?? ""}`.trim().slice(0, MAX_OUTPUT_CHARS);
        if (!err) {
          resolve({ ok: true, missing: false, output });
          return;
        }
        const missing = (err as NodeJS.ErrnoException).code === "ENOENT";
        const killed = (err as { killed?: boolean }).killed === true;
        const note = killed ? `timed out after ${timeoutMs}ms` : "";
        resolve({ ok: false, missing, output: [output, note].filter(Boolean).join("\n").trim() });
      },
    );
  });
}

export async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), `superskill-rules-${prefix}-`));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((e: unknown) => {
      console.error(`[rules-harness] failed to remove ${dir}: ${String(e)}`);
    });
  }
}

export function okResult(compiler: string, output = ""): HarnessResult {
  return { ok: true, skipped: false, compiler, output };
}

export function failResult(compiler: string, output: string): HarnessResult {
  return { ok: false, skipped: false, compiler, output };
}

export function skippedResult(tool: string): HarnessResult {
  return { ok: false, skipped: true, compiler: "skipped", output: `${tool} is not available` };
}

export async function tryCandidates(
  compiler: string,
  candidates: string[],
  attempt: (code: string) => Promise<RunResult>,
): Promise<HarnessResult> {
  let firstFailure: RunResult | null = null;
  for (const code of new Set(candidates)) {
    const result = await attempt(code);
    if (result.missing) return { ok: false, skipped: true, compiler: "skipped", output: result.output };
    if (result.ok) return okResult(compiler, result.output);
    firstFailure = firstFailure ?? result;
  }
  return failResult(compiler, firstFailure?.output ?? "");
}
