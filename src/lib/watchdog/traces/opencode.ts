// SPDX-License-Identifier: Apache-2.0
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { SessionTrace, TraceSessionRef, TraceToolCall } from "../types.js";
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
  readJson,
  safeStat,
  type TraceListOptions,
  type TraceLoadOptions,
  type TraceSource,
} from "./source.js";

interface OpencodeSessionFile {
  id?: string;
  title?: string;
  directory?: string;
  time?: { created?: number; updated?: number };
  summary?: { additions?: number; deletions?: number; files?: number };
}

interface OpencodeMessageFile {
  id?: string;
  role?: string;
  modelID?: string;
  providerID?: string;
  cost?: number;
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
  time?: { created?: number };
}

interface OpencodePartFile {
  type?: string;
  tool?: string;
  text?: string;
  state?: {
    status?: string;
    input?: Record<string, unknown>;
    output?: unknown;
    error?: unknown;
  };
}

function dataRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.SUPERSKILL_OPENCODE_DATA ?? join(homedir(), ".local", "share", "opencode");
}

function storageRoot(): string | null {
  const root = dataRoot();
  return root;
}

async function listSessions(opts: TraceListOptions = {}): Promise<TraceSessionRef[]> {
  const storage = join(storageRoot() ?? "", "storage");
  const projectDirs = await listDirs(join(storage, "session"));
  const refs: TraceSessionRef[] = [];
  const projectFilter = opts.project ? resolve(opts.project) : undefined;

  for (const dir of projectDirs) {
    const files = await listFiles(join(storage, "session", dir), ".json");
    for (const file of files) {
      const path = join(storage, "session", dir, file);
      const session = await readJson<OpencodeSessionFile>(path);
      if (!session?.id) continue;
      const directory = session.directory ? resolve(session.directory) : undefined;
      if (projectFilter && directory !== projectFilter && !directory?.startsWith(`${projectFilter}/`)) continue;
      const startedAt = session.time?.created ?? 0;
      const updatedAt = session.time?.updated ?? startedAt;
      if (opts.since !== undefined && updatedAt < opts.since) continue;
      refs.push({
        tool: "opencode",
        id: session.id,
        ...(session.title !== undefined ? { title: session.title } : {}),
        ...(directory !== undefined ? { project: directory } : {}),
        startedAt,
        updatedAt,
        storagePath: path,
      });
    }
  }

  refs.sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  return opts.limit !== undefined ? refs.slice(0, opts.limit) : refs;
}

function normalizeParts(parts: OpencodePartFile[], message: OpencodeMessageFile, trace: SessionTrace, maxCalls: number): void {
  for (const part of parts) {
    if (part.type === "text" && message.role === "user" && typeof part.text === "string") {
      pushUserTurn(trace, part.text);
      continue;
    }
    if (part.type !== "tool" || typeof part.tool !== "string") continue;

    const state = part.state ?? {};
    const input = state.input ?? {};
    const status: TraceToolCall["status"] =
      state.status === "completed" ? "ok" : state.status === "error" ? "error" : "unknown";

    const call: Parameters<typeof addCall>[1] = { name: part.tool, status };
    const filePath = typeof input.filePath === "string" ? input.filePath : undefined;
    if (part.tool === "bash" && typeof input.command === "string") {
      call.inputSummary = capText(input.command);
      trace.commands.push(capText(input.command, 400));
    } else if (filePath !== undefined) {
      call.inputSummary = capText(filePath);
      call.filePath = filePath;
    } else {
      const first = Object.values(input).find((value) => typeof value === "string");
      if (typeof first === "string") call.inputSummary = capText(first);
    }

    if (state.output !== undefined) {
      const output = typeof state.output === "string" ? state.output : JSON.stringify(state.output);
      call.outputBytes = Buffer.byteLength(output, "utf-8");
    }
    if (status === "error") {
      const err = state.error !== undefined
        ? typeof state.error === "string" ? state.error : JSON.stringify(state.error)
        : typeof state.output === "string" ? state.output : "";
      if (err.length > 0) call.errorText = errorText(err);
    }

    if (filePath !== undefined) {
      if (part.tool === "read") trace.filesRead.push(filePath);
      if (part.tool === "write" || part.tool === "edit" || part.tool === "patch") trace.filesWritten.push(filePath);
    }
    addCall(trace, call, maxCalls);
  }
}

async function loadTrace(ref: TraceSessionRef, opts: TraceLoadOptions = {}): Promise<SessionTrace> {
  const trace = newTrace(ref);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_TRACE_BYTES;
  const maxCalls = opts.maxCalls ?? DEFAULT_MAX_CALLS;
  const budget = { remaining: maxBytes };

  const session = await readJson<OpencodeSessionFile>(ref.storagePath);
  if (session?.summary) {
    trace.diff = {
      files: session.summary.files ?? 0,
      additions: session.summary.additions ?? 0,
      deletions: session.summary.deletions ?? 0,
    };
  }

  const storage = join(storageRoot() ?? "", "storage");
  const messageDir = join(storage, "message", ref.id);
  const messageFiles = await listFiles(messageDir, ".json");

  const messages: Array<{ file: string; data: OpencodeMessageFile }> = [];
  for (const file of messageFiles) {
    const data = await readJson<OpencodeMessageFile>(join(messageDir, file));
    if (data) messages.push({ file, data });
  }
  messages.sort((a, b) => (a.data.time?.created ?? 0) - (b.data.time?.created ?? 0));

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let reasoning = 0;
  let cost = 0;

  for (const { file, data } of messages) {
    if (data.role === "assistant") {
      inputTokens += data.tokens?.input ?? 0;
      outputTokens += data.tokens?.output ?? 0;
      cacheRead += data.tokens?.cache?.read ?? 0;
      cacheWrite += data.tokens?.cache?.write ?? 0;
      reasoning += data.tokens?.reasoning ?? 0;
      cost += data.cost ?? 0;
      if (data.modelID) trace.model = data.modelID;
      if (data.providerID) trace.provider = data.providerID;
    }

    const messageId = data.id ?? file.replace(/\.json$/, "");
    const partDir = join(storage, "part", messageId);
    const partFiles = await listFiles(partDir, ".json");
    if (partFiles.length === 0) continue;

    const parts: OpencodePartFile[] = [];
    for (const partFile of partFiles) {
      const partPath = join(partDir, partFile);
      const info = await safeStat(partPath);
      const size = info?.size ?? 0;
      if (size > budget.remaining) {
        trace.truncated = true;
        continue;
      }
      budget.remaining -= size;
      const part = await readJson<OpencodePartFile>(partPath);
      if (part) parts.push(part);
    }
    normalizeParts(parts, data, trace, maxCalls);
  }

  if (inputTokens > 0 || outputTokens > 0 || cacheRead > 0 || cacheWrite > 0) {
    trace.tokens = { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, reasoning };
  }
  if (cost > 0) trace.cost = cost;

  trace.filesRead = [...new Set(trace.filesRead)];
  trace.filesWritten = [...new Set(trace.filesWritten)];
  return trace;
}

export const opencodeSource: TraceSource = {
  id: "opencode",
  label: "OpenCode",
  root: storageRoot,
  list: listSessions,
  load: loadTrace,
};

export async function available(): Promise<boolean> {
  const storage = join(storageRoot() ?? "", "storage", "session");
  const dirs = await listDirs(storage);
  return dirs.length > 0;
}
