// SPDX-License-Identifier: Apache-2.0
import { constants } from "node:fs";
import { open, readdir, lstat } from "node:fs/promises";
import type { SessionTrace, TraceSessionRef } from "../types.js";

export interface TraceListOptions {
  /** Absolute directory the session ran in. */
  project?: string | null;
  /** Only sessions updated at/after this epoch ms. */
  since?: number;
  /** Restrict to one harness id (opencode | claude-code | codex). */
  tool?: string;
  limit?: number;
}

export interface TraceLoadOptions {
  /** Byte budget for raw trace payload reads. */
  maxBytes?: number;
  /** Max tool calls retained per trace. */
  maxCalls?: number;
}

export interface TraceSource {
  id: string;
  label: string;
  /** Store root when the harness is installed, else null. */
  root(): string | null;
  list(opts?: TraceListOptions): Promise<TraceSessionRef[]>;
  load(ref: TraceSessionRef, opts?: TraceLoadOptions): Promise<SessionTrace>;
}

export const DEFAULT_MAX_TRACE_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MAX_CALLS = 500;
export const MAX_TRACE_SOURCE_ERRORS = 8;
const MAX_PROMPT_CHARS = 500;
const MAX_ERROR_CHARS = 300;
const MAX_SUMMARY_CHARS = 160;
const SAFE_ERROR_CODES = new Set([
  "EACCES", "EISDIR", "ELOOP", "EMFILE", "ENFILE", "ENOTDIR", "ENOENT", "EPERM", "EROFS", "EIO",
  "FILE_NOT_FOUND", "INVALID_DATA", "TRUNCATED", "UNKNOWN",
]);

export class TraceSourceError extends Error {
  readonly code: string;

  constructor(operation: string, code: string) {
    const safeCode = SAFE_ERROR_CODES.has(code) ? code : "UNKNOWN";
    super(`${operation} failed (${safeCode}).`);
    this.name = "TraceSourceError";
    this.code = safeCode;
  }
}

export function traceErrorCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return typeof code === "string" && SAFE_ERROR_CODES.has(code) ? code : "UNKNOWN";
}

export function logSourceError(operation: string, error: unknown): void {
  const code = traceErrorCode(error);
  if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "FILE_NOT_FOUND") {
    console.error(`[watchdog] ${operation} failed: ${code}`);
  }
}

function traceSourceError(operation: string, error: unknown): TraceSourceError {
  return error instanceof TraceSourceError ? error : new TraceSourceError(operation, traceErrorCode(error));
}

function addTraceError(trace: SessionTrace, code: string): void {
  const errors = trace.sourceErrors ?? [];
  if (errors.includes(code) || errors.length >= MAX_TRACE_SOURCE_ERRORS) return;
  errors.push(code);
  trace.sourceErrors = errors;
}

function validateBoundedJson(path: string, text: string, truncated: boolean): void {
  const jsonl = path.endsWith(".jsonl");
  if (!jsonl && !path.endsWith(".json")) return;
  const values = jsonl ? text.split("\n") : [text];
  if (jsonl && truncated) values.pop();
  if (truncated && !jsonl) return;
  for (const value of values) {
    if (value.trim() === "") continue;
    try {
      JSON.parse(value);
    } catch {
      throw new TraceSourceError("trace JSON parse", "INVALID_DATA");
    }
  }
}

export function capText(text: string, max = MAX_SUMMARY_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function traceLimits(opts: TraceLoadOptions): { maxBytes: number; maxCalls: number } {
  const bounded = (value: number | undefined, cap: number) => Number.isFinite(value ?? cap)
    ? Math.min(cap, Math.max(0, Math.floor(value ?? cap))) : cap;
  return { maxBytes: bounded(opts.maxBytes, DEFAULT_MAX_TRACE_BYTES), maxCalls: bounded(opts.maxCalls, DEFAULT_MAX_CALLS) };
}

export async function readTextBounded(path: string, maxBytes: number): Promise<{ text: string; bytes: number; truncated: boolean } | null> {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await handle.stat();
    if (!info.isFile()) throw new TraceSourceError("trace read", info.isDirectory() ? "EISDIR" : "INVALID_DATA");
    const limit = Math.max(0, Math.floor(maxBytes));
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes < limit) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, limit - bytes));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      chunks.push(buffer.subarray(0, bytesRead));
      bytes += bytesRead;
    }
    const text = Buffer.concat(chunks, bytes).toString("utf-8");
    const truncated = (await handle.stat()).size > bytes;
    validateBoundedJson(path, text, truncated);
    return { text, bytes, truncated };
  } catch (error) {
    if (traceErrorCode(error) === "ENOENT") return null;
    throw traceSourceError("trace read", error);
  } finally {
    try {
      await handle?.close();
    } catch (error) {
      throw traceSourceError("trace close", error);
    }
  }
}

export async function* readTraceLines(path: string, maxBytes: number, maxLineBytes: number, trace: SessionTrace): AsyncGenerator<string> {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await handle.stat();
    if (!info.isFile()) throw new TraceSourceError("trace read", info.isDirectory() ? "EISDIR" : "INVALID_DATA");
    if (info.size > maxBytes) {
      trace.truncated = true;
      addTraceError(trace, "TRUNCATED");
    }
    let remaining = maxBytes;
    let parts: Buffer[] = [];
    let lineBytes = 0;
    let skipping = false;
    while (remaining > 0) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, remaining));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      remaining -= bytesRead;
      let start = 0;
      while (start < bytesRead) {
        const newline = buffer.indexOf(10, start);
        const end = newline < 0 || newline >= bytesRead ? bytesRead : newline;
        const part = buffer.subarray(start, end);
        lineBytes += part.length;
        if (!skipping && lineBytes > maxLineBytes) {
          skipping = true;
          parts = [];
          trace.truncated = true;
          addTraceError(trace, "TRUNCATED");
        }
        if (!skipping) parts.push(part);
        if (end < bytesRead) {
          if (!skipping) {
            const line = Buffer.concat(parts, lineBytes).toString("utf-8");
            if (line.trim() !== "") {
              let valid = true;
              try {
                JSON.parse(line);
              } catch {
                addTraceError(trace, "INVALID_DATA");
                valid = false;
              }
              if (valid) yield line;
            } else {
              yield line;
            }
          }
          parts = [];
          lineBytes = 0;
          skipping = false;
        }
        start = end + 1;
      }
    }
    if ((await handle.stat()).size > maxBytes - remaining) {
      trace.truncated = true;
      addTraceError(trace, "TRUNCATED");
    }
    if (!skipping && lineBytes > 0 && info.size <= maxBytes) {
      const line = Buffer.concat(parts, lineBytes).toString("utf-8");
      if (line.trim() !== "") {
        let valid = true;
        try {
          JSON.parse(line);
        } catch {
          addTraceError(trace, "INVALID_DATA");
          valid = false;
        }
        if (valid) yield line;
      } else {
        yield line;
      }
    }
  } catch (error) {
    const code = traceErrorCode(error);
    if (code !== "ENOENT") addTraceError(trace, traceErrorCode(traceSourceError("trace read", error)));
  } finally {
    try {
      await handle?.close();
    } catch (error) {
      addTraceError(trace, traceErrorCode(traceSourceError("trace close", error)));
    }
  }
}

export async function safeStat(path: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const info = await lstat(path);
    if (!info.isFile()) return null;
    return { size: info.size, mtimeMs: info.mtimeMs };
  } catch (error) {
    if (traceErrorCode(error) === "ENOENT") return null;
    throw traceSourceError("trace stat", error);
  }
}

export async function readJson<T>(path: string, maxBytes = 1024 * 1024): Promise<T | null> {
  let raw: { text: string; bytes: number; truncated: boolean } | null;
  try {
    raw = await readTextBounded(path, maxBytes);
  } catch (error) {
    if (traceErrorCode(error) === "ENOENT") return null;
    throw error;
  }
  if (!raw) return null;
  if (raw.truncated) throw new TraceSourceError("trace JSON read", "TRUNCATED");
  try {
    return JSON.parse(raw.text) as T;
  } catch {
    throw new TraceSourceError("trace JSON parse", "INVALID_DATA");
  }
}

export async function listDirs(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (traceErrorCode(error) === "ENOENT") return [];
    throw traceSourceError("trace directory listing", error);
  }
}

export async function listFiles(path: string, suffix?: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && (suffix === undefined || entry.name.endsWith(suffix)))
      .map((entry) => entry.name);
  } catch (error) {
    if (traceErrorCode(error) === "ENOENT") return [];
    throw traceSourceError("trace file listing", error);
  }
}

export function newTrace(ref: TraceSessionRef): SessionTrace {
  return {
    ref,
    userTurns: [],
    toolCalls: [],
    filesRead: [],
    filesWritten: [],
    commands: [],
    truncated: false,
  };
}

export function pushUserTurn(trace: SessionTrace, text: string): void {
  if (trace.userTurns.length >= 50) return;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length === 0) return;
  trace.userTurns.push(clean.length > MAX_PROMPT_CHARS ? `${clean.slice(0, MAX_PROMPT_CHARS - 1)}…` : clean);
}

export function errorText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_ERROR_CHARS ? `${clean.slice(0, MAX_ERROR_CHARS - 1)}…` : clean;
}

export function addCall(trace: SessionTrace, call: { name: string; status?: "ok" | "error" | "unknown"; inputSummary?: string; inputSignature?: string; errorText?: string; outputBytes?: number; filePath?: string }, maxCalls: number): boolean {
  if (trace.toolCalls.length >= maxCalls) {
    trace.truncated = true;
    return false;
  }
  trace.toolCalls.push({
    index: trace.toolCalls.length,
    name: call.name,
    status: call.status ?? "unknown",
    ...(call.inputSignature !== undefined ? { inputSignature: call.inputSignature } : {}),
    ...(call.inputSummary !== undefined ? { inputSummary: call.inputSummary } : {}),
    ...(call.errorText !== undefined ? { errorText: call.errorText } : {}),
    ...(call.outputBytes !== undefined ? { outputBytes: call.outputBytes } : {}),
    ...(call.filePath !== undefined ? { filePath: call.filePath } : {}),
  });
  return true;
}
