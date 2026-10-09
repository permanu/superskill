// SPDX-License-Identifier: Apache-2.0
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { SessionTrace, TraceSessionRef } from "../types.js";

export interface TraceListOptions {
  /** Absolute directory the session ran in. */
  project?: string;
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
const MAX_PROMPT_CHARS = 500;
const MAX_ERROR_CHARS = 300;
const MAX_SUMMARY_CHARS = 160;

export function capText(text: string, max = MAX_SUMMARY_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export async function safeStat(path: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const info = await stat(path);
    return { size: info.size, mtimeMs: info.mtimeMs };
  } catch {
    return null;
  }
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function listDirs(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function listFiles(path: string, suffix?: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && (suffix === undefined || entry.name.endsWith(suffix)))
      .map((entry) => entry.name);
  } catch {
    return [];
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

export function addCall(trace: SessionTrace, call: { name: string; status?: "ok" | "error" | "unknown"; inputSummary?: string; inputSignature?: string; errorText?: string; outputBytes?: number; filePath?: string }, maxCalls: number): void {
  if (trace.toolCalls.length >= maxCalls) {
    trace.truncated = true;
    return;
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
}

/** Decode a Claude Code project dir slug ("-Users-me-repo") back to a path. */
export function decodeClaudeSlug(slug: string): string {
  if (!slug.startsWith("-")) return slug;
  return `/${slug.slice(1).split("-").join("/")}`;
}
