// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { recordInput } from "./codex-input.js";
import { open } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { SessionTrace, TraceSessionRef } from "../types.js";
import {
  addCall,
  capText,
  DEFAULT_MAX_CALLS,
  DEFAULT_MAX_TRACE_BYTES,
  errorText,
  listDirs,
  listFiles,
  newTrace,
  pushUserTurn,
  safeStat,
  type TraceListOptions,
  type TraceLoadOptions,
  type TraceSource,
} from "./source.js";

/**
 * Codex stores rollouts under ~/.codex/sessions/<year>/<month>/<day>/rollout-*.jsonl.
 * Format is best-effort: session_meta + response_item (custom_tool_call/output) +
 * token_usage_record. Subagent threads are skipped in listings (their work appears
 * inside the parent thread).
 */

const HEAD_SCAN_BYTES = 8 * 1024;
const MAX_LINE_BYTES = 4 * 1024 * 1024;

function sessionsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.SUPERSKILL_CODEX_SESSIONS ?? join(homedir(), ".codex", "sessions");
}

async function readHead(path: string): Promise<string> {
  const handle = await open(path, "r").catch(() => null);
  if (!handle) return "";
  try {
    const buffer = Buffer.alloc(HEAD_SCAN_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_SCAN_BYTES, 0);
    return buffer.toString("utf-8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    await handle.close();
  }
}

function parseStartedAt(name: string, fallback: number): number {
  const match = /rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(name);
  if (!match) return fallback;
  const [, y, mo, d, h, mi, s] = match;
  const ts = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return Number.isNaN(ts) ? fallback : ts;
}

async function listSessions(opts: TraceListOptions = {}): Promise<TraceSessionRef[]> {
  const root = sessionsRoot();
  const refs: TraceSessionRef[] = [];
  const projectFilter = opts.project ? resolve(opts.project) : undefined;

  for (const year of await listDirs(root)) {
    if (!/^\d{4}$/.test(year)) continue;
    for (const month of await listDirs(join(root, year))) {
      for (const day of await listDirs(join(root, year, month))) {
        const dir = join(root, year, month, day);
        for (const file of await listFiles(dir, ".jsonl")) {
          const path = join(dir, file);
          const info = await safeStat(path);
          if (!info) continue;
          const startedAt = parseStartedAt(file, info.mtimeMs);
          if (opts.since !== undefined && startedAt < opts.since) continue;

          const head = await readHead(path);
          if (head.includes('"thread_source":"subagent"')) continue;
          const cwdMatch = /"cwd":"([^"]+)"/.exec(head);
          const project = cwdMatch ? cwdMatch[1] : undefined;
          if (projectFilter && (project === undefined || (resolve(project) !== projectFilter && !resolve(project).startsWith(`${projectFilter}/`)))) {
            continue;
          }

          refs.push({
            tool: "codex",
            id: file.replace(/\.jsonl$/, ""),
            ...(project !== undefined ? { project } : {}),
            startedAt,
            updatedAt: info.mtimeMs,
            storagePath: path,
          });
        }
      }
    }
  }

  refs.sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  return opts.limit !== undefined ? refs.slice(0, opts.limit) : refs;
}

interface CodexLine {
  type?: string;
  payload?: {
    type?: string;
    cwd?: string;
    status?: string;
    name?: string;
    call_id?: string;
    input?: unknown;
    arguments?: unknown;
    output?: unknown;
    role?: string;
    content?: unknown;
    message?: unknown;
    text?: string;
    usage?: {
      input_tokens?: number;
      cached_input_tokens?: number;
      output_tokens?: number;
      reasoning_output_tokens?: number;
    };
  };
}

function outputText(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(item => item && typeof item === "object" && "text" in item && typeof item.text === "string" ? item.text : "").join("\n");
  return output && typeof output === "object" ? JSON.stringify(output) : "";
}

function outputState(output: unknown): { error: boolean; running: boolean; cell?: string } {
  const state: { error: boolean; running: boolean; cell?: string } = { error: false, running: false };
  let remaining = 2000;
  function visit(value: unknown, depth: number): void {
    if (depth > 8 || --remaining < 0) return;
    if (typeof value === "string") {
      try {
        const parsed: unknown = JSON.parse(value);
        if (typeof parsed !== "string") { visit(parsed, depth + 1); return; }
      } catch {}
      const envelope = value.split(/(?:^|\n)(?:Final )?Output:\s*\n/i, 1)[0];
      const cell = /^Script running with cell ID ([\w-]+)/m.exec(envelope);
      if (cell) { state.running = true; state.cell = cell[1]; }
      if (/^(?:Process (?:exited|exit(?:ed)?) (?:with )?code:? [1-9]\d*|Script (?:failed|error)|Error executing)/m.test(envelope)) state.error = true;
      for (const part of [value, ...value.split("\n").filter(line => /^[{[]/.test(line.trim()))]) {
        try { const parsed: unknown = JSON.parse(part); if (parsed !== part) visit(parsed, depth + 1); } catch { continue; }
      }
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if (obj.isError === true || obj.status === "failed" || obj.status === "error" || (typeof obj.exit_code === "number" && obj.exit_code !== 0) || (obj.success === false && obj.error !== undefined)) state.error = true;
    if (obj.session_id !== undefined && (obj.exit_code === null || obj.exit_code === undefined)) state.running = true;
    if ("exit_code" in obj || "session_id" in obj) return;
    for (const key of ["content", "text", "output", "result", "results", "value"]) if (obj[key] !== undefined) visit(obj[key], depth + 1);
  }
  visit(output, 0);
  return state;
}

function messageText(payload: CodexLine["payload"]): string {
  if (typeof payload?.text === "string") return payload.text;
  if (typeof payload?.message === "string") return payload.message;
  const content = payload?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text;
        return "";
      })
      .filter((text) => text.length > 0)
      .join("\n");
  }
  return "";
}

async function loadTrace(ref: TraceSessionRef, opts: TraceLoadOptions = {}): Promise<SessionTrace> {
  const trace = newTrace(ref);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_TRACE_BYTES;
  const maxCalls = opts.maxCalls ?? DEFAULT_MAX_CALLS;

  const info = await safeStat(ref.storagePath);
  if (info && info.size > maxBytes) trace.truncated = true;

  let raw: string;
  const handle = await open(ref.storagePath, "r").catch(() => null);
  if (!handle) return trace;
  try {
    const buffer = Buffer.alloc(Math.min(info?.size ?? maxBytes, maxBytes));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    raw = buffer.toString("utf-8", 0, bytesRead);
  } finally {
    await handle.close();
  }

  const pending = new Map<string, number>();
  const cells = new Map<string, number>();
  const waits = new Map<string, string>();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let reasoning = 0;
  let lastCwd: string | undefined;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (Buffer.byteLength(trimmed, "utf-8") > MAX_LINE_BYTES) {
      trace.truncated = true;
      continue;
    }
    let parsed: CodexLine;
    try {
      parsed = JSON.parse(trimmed) as CodexLine;
    } catch {
      continue;
    }

    const payload = parsed.payload;
    if (parsed.type === "session_meta") {
      if (typeof payload?.cwd === "string") lastCwd = payload.cwd;
      continue;
    }

    if (parsed.type === "token_usage_record" && payload?.usage) {
      const usage = payload.usage;
      inputTokens = Math.max(inputTokens, usage.input_tokens ?? 0);
      cacheRead = Math.max(cacheRead, usage.cached_input_tokens ?? 0);
      outputTokens += usage.output_tokens ?? 0;
      reasoning += usage.reasoning_output_tokens ?? 0;
      continue;
    }

    if (parsed.type === "response_item" && payload) {
      const type = payload.type;
      if (type === "custom_tool_call" || type === "function_call") {
        const name = payload.name ?? "exec";
        let input = payload.input ?? payload.arguments;
        if (payload.arguments !== undefined && typeof input === "string") {
          try { input = JSON.parse(input) as unknown; } catch { input = payload.arguments; }
        }
        const before = trace.toolCalls.length;
        if (before >= maxCalls) { trace.truncated = true; continue; }
        const summary = recordInput(trace, name, input);
        const signature = createHash("sha256").update(typeof input === "string" ? input : JSON.stringify(input) ?? "").digest("hex");
        addCall(trace, {
          name,
          status: payload.status === "failed" ? "error" : "unknown",
          inputSignature: signature,
          ...(summary !== undefined ? { inputSummary: capText(summary) } : {}),
        }, maxCalls);
        if (typeof payload.call_id === "string") {
          pending.set(payload.call_id, before);
          if ((name === "wait" || name === "functions.wait") && input && typeof input === "object" && "cell_id" in input && typeof input.cell_id === "string") waits.set(payload.call_id, input.cell_id);
        }
        continue;
      }
      if (type === "custom_tool_call_output" || type === "function_call_output") {
        if (typeof payload.call_id === "string") {
          const index = pending.get(payload.call_id);
          const call = index !== undefined ? trace.toolCalls[index] : undefined;
          if (call) {
            const text = outputText(payload.output);
            const state = outputState(payload.output);
            if (text.length > 0) call.outputBytes = (call.outputBytes ?? 0) + Buffer.byteLength(text, "utf-8");
            call.status = call.status === "error" || state.error ? "error" : state.running ? "unknown" : "ok";
            if (call.status === "error" && text.length > 0) call.errorText = errorText(text);
            const cell = waits.get(payload.call_id);
            const original = cell ? cells.get(cell) : undefined;
            if (original !== undefined) {
              const origin = trace.toolCalls[original];
              origin.status = origin.status === "error" ? "error" : call.status;
              if (call.errorText) origin.errorText = call.errorText;
              origin.outputBytes = (origin.outputBytes ?? 0) + (call.outputBytes ?? 0);
              if (!state.running) cells.delete(cell!);
            }
            if (state.cell && index !== undefined) cells.set(state.cell, original ?? index);
          }
        }
        continue;
      }
      if (type === "message" && payload.role === "user") {
        const text = messageText(payload);
        if (text.length > 0) pushUserTurn(trace, text);
        continue;
      }
    }

    if (parsed.type === "event_msg" && payload?.type === "user_message") {
      const text = messageText(payload);
      if (text.length > 0) pushUserTurn(trace, text);
    }
  }

  if (inputTokens > 0 || outputTokens > 0 || cacheRead > 0) {
    trace.tokens = { input: inputTokens, output: outputTokens, cacheRead, cacheWrite: 0, reasoning };
  }
  if (lastCwd !== undefined) trace.ref = { ...trace.ref, project: lastCwd };
  trace.filesRead = [...new Set(trace.filesRead)];
  trace.filesWritten = [...new Set(trace.filesWritten)];
  return trace;
}

export const codexSource: TraceSource = {
  id: "codex",
  label: "Codex CLI",
  root: () => sessionsRoot(),
  list: listSessions,
  load: loadTrace,
};

export async function available(): Promise<boolean> {
  const years = await listDirs(sessionsRoot());
  return years.length > 0;
}
