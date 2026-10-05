// SPDX-License-Identifier: Apache-2.0
import { open, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { SessionTrace, TraceSessionRef } from "../types.js";
import {
  addCall,
  capText,
  decodeClaudeSlug,
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

const MAX_LINE_BYTES = 1024 * 1024;
const HEAD_SCAN_BYTES = 16 * 1024;

interface ClaudeLine {
  type?: string;
  isSidechain?: boolean;
  cwd?: string;
  timestamp?: string;
  message?: {
    role?: string;
    model?: string;
    content?: unknown;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

function projectsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.SUPERSKILL_CLAUDE_PROJECTS ?? join(homedir(), ".claude", "projects");
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

async function listSessions(opts: TraceListOptions = {}): Promise<TraceSessionRef[]> {
  const root = projectsRoot();
  const projectDirs = await listDirs(root);
  const projectFilter = opts.project ? resolve(opts.project) : undefined;
  const refs: TraceSessionRef[] = [];

  for (const dir of projectDirs) {
    const files = await listFiles(join(root, dir), ".jsonl");
    for (const file of files) {
      const path = join(root, dir, file);
      const info = await safeStat(path);
      if (!info) continue;
      if (opts.since !== undefined && info.mtimeMs < opts.since) continue;

      let project = decodeClaudeSlug(dir);
      if (projectFilter !== undefined) {
        const head = await readHead(path);
        const match = /"cwd":"([^"]+)"/.exec(head);
        if (match) project = match[1];
        if (resolve(project) !== projectFilter && !resolve(project).startsWith(`${projectFilter}/`)) continue;
      }

      refs.push({
        tool: "claude-code",
        id: file.replace(/\.jsonl$/, ""),
        project,
        startedAt: info.mtimeMs,
        updatedAt: info.mtimeMs,
        storagePath: path,
      });
    }
  }

  refs.sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  return opts.limit !== undefined ? refs.slice(0, opts.limit) : refs;
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block && typeof block === "object" && "text" in block && typeof block.text === "string") {
          return block.text;
        }
        return "";
      })
      .filter((text) => text.length > 0)
      .join("\n");
  }
  return "";
}

interface PendingToolUse {
  callIndex: number;
  name: string;
  input: Record<string, unknown>;
}

function summarizeToolInput(name: string, input: Record<string, unknown>): { summary?: string; filePath?: string; command?: string } {
  const filePath = typeof input.file_path === "string" ? input.file_path : undefined;
  const command = typeof input.command === "string" ? input.command : undefined;
  if (command !== undefined) return { summary: capText(command), command };
  if (filePath !== undefined) return { summary: capText(filePath), filePath };
  const pattern = typeof input.pattern === "string" ? input.pattern : undefined;
  if (pattern !== undefined) return { summary: capText(`${name} ${pattern}`) };
  const description = typeof input.description === "string" ? input.description : undefined;
  if (description !== undefined) return { summary: capText(description) };
  return {};
}

async function loadTrace(ref: TraceSessionRef, opts: TraceLoadOptions = {}): Promise<SessionTrace> {
  const trace = newTrace(ref);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_TRACE_BYTES;
  const maxCalls = opts.maxCalls ?? DEFAULT_MAX_CALLS;

  const info = await safeStat(ref.storagePath);
  if (info && info.size > maxBytes) trace.truncated = true;

  let raw: string;
  try {
    raw = await readFile(ref.storagePath, "utf-8");
  } catch {
    return trace;
  }
  if (raw.length > maxBytes) raw = raw.slice(0, maxBytes);

  const pending = new Map<string, PendingToolUse>();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let lastCwd: string | undefined;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const tooLong = Buffer.byteLength(trimmed, "utf-8") > MAX_LINE_BYTES;
    let parsed: ClaudeLine | null = null;
    if (!tooLong) {
      try {
        parsed = JSON.parse(trimmed) as ClaudeLine;
      } catch {
        continue;
      }
    }
    if (!parsed) {
      if (tooLong) trace.truncated = true;
      continue;
    }

    if (typeof parsed.cwd === "string") lastCwd = parsed.cwd;
    if (parsed.message?.model && trace.model === undefined) trace.model = parsed.message.model;

    const usage = parsed.message?.usage;
    if (usage) {
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
      cacheRead += usage.cache_read_input_tokens ?? 0;
      cacheWrite += usage.cache_creation_input_tokens ?? 0;
    }

    const content = parsed.message?.content;
    if (parsed.type === "assistant" && Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type !== "tool_use" || typeof b.name !== "string") continue;
        const input = (b.input && typeof b.input === "object" ? b.input : {}) as Record<string, unknown>;
        const { summary, filePath, command } = summarizeToolInput(b.name, input);
        addCall(trace, {
          name: b.name,
          status: "unknown",
          ...(summary !== undefined ? { inputSummary: summary } : {}),
          ...(filePath !== undefined ? { filePath } : {}),
        }, maxCalls);
        if (command !== undefined) trace.commands.push(capText(command, 400));
        if (filePath !== undefined) {
          if (b.name === "Read") trace.filesRead.push(filePath);
          if (b.name === "Write" || b.name === "Edit" || b.name === "MultiEdit" || b.name === "NotebookEdit") {
            trace.filesWritten.push(filePath);
          }
        }
        if (typeof b.id === "string") {
          pending.set(b.id, { callIndex: trace.toolCalls.length - 1, name: b.name, input });
        }
      }
    }

    if (parsed.type === "user" && Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const b = block as Record<string, unknown>;
        if (b.type === "tool_result" && typeof b.tool_use_id === "string") {
          const entry = pending.get(b.tool_use_id);
          if (entry) {
            const call = trace.toolCalls[entry.callIndex];
            if (call) {
              call.status = b.is_error === true ? "error" : "ok";
              if (b.is_error === true) {
                const text = contentText(b.content);
                if (text.length > 0) call.errorText = errorText(text);
              }
            }
            pending.delete(b.tool_use_id);
          }
        }
      }
    }

    if (parsed.type === "user" && !parsed.isSidechain) {
      if (typeof content === "string") {
        pushUserTurn(trace, content);
      } else if (Array.isArray(content) && !content.some((block) => (block as { type?: string } | null)?.type === "tool_result")) {
        const text = contentText(content);
        if (text.length > 0) pushUserTurn(trace, text);
      }
    }
  }

  if (inputTokens > 0 || outputTokens > 0 || cacheRead > 0 || cacheWrite > 0) {
    trace.tokens = { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, reasoning: 0 };
  }
  if (lastCwd !== undefined) trace.ref = { ...trace.ref, project: lastCwd };
  trace.filesRead = [...new Set(trace.filesRead)];
  trace.filesWritten = [...new Set(trace.filesWritten)];
  return trace;
}

export const claudeCodeSource: TraceSource = {
  id: "claude-code",
  label: "Claude Code",
  root: () => projectsRoot(),
  list: listSessions,
  load: loadTrace,
};

export async function available(): Promise<boolean> {
  const dirs = await listDirs(projectsRoot());
  return dirs.length > 0;
}
