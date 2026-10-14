// SPDX-License-Identifier: Apache-2.0
import type { SessionTrace, TraceSessionRef, TraceSourceIssue } from "../types.js";
import { opencodeSource } from "./opencode.js";
import { claudeCodeSource } from "./claude-code.js";
import { codexSource } from "./codex.js";
import { MAX_TRACE_SOURCE_ERRORS, traceErrorCode, type TraceListOptions, type TraceLoadOptions, type TraceSource } from "./source.js";

export type { TraceListOptions, TraceLoadOptions, TraceSource } from "./source.js";

/**
 * Trace registry — mirrors CLIENT_REGISTRY (setup/clients.ts) for the read side:
 * one entry per harness whose session logs superskill can ingest. Harnesses with
 * no reader fall back to superskill's own session notes/graph/telemetry (Tier 1).
 */
export const TRACE_REGISTRY: TraceSource[] = [opencodeSource, claudeCodeSource, codexSource];

export function traceSource(tool: string): TraceSource | undefined {
  return TRACE_REGISTRY.find((source) => source.id === tool);
}

export interface TraceSourceStatus {
  id: string;
  label: string;
  root: string | null;
}

export function describeTraceSources(): TraceSourceStatus[] {
  return TRACE_REGISTRY.map((source) => ({ id: source.id, label: source.label, root: source.root() }));
}

export async function listTraceSessions(opts: TraceListOptions = {}): Promise<TraceSessionRef[]> {
  const result = await collectTraceSessions(opts);
  if (result.sourceErrors.length > 0) {
    const detail = result.sourceErrors.map(({ source, code }) => `${source}:${code}`).join(", ");
    throw new Error(`Trace listing incomplete (${detail}).`);
  }
  return result.sessions;
}

export async function collectTraceSessions(opts: TraceListOptions = {}): Promise<{ sessions: TraceSessionRef[]; sourceErrors: TraceSourceIssue[] }> {
  const results: TraceSessionRef[] = [];
  const sourceErrors: TraceSourceIssue[] = [];
  for (const source of TRACE_REGISTRY) {
    if (opts.tool !== undefined && opts.tool !== source.id) continue;
    try {
      results.push(...(await source.list(opts)));
    } catch (error: unknown) {
      if (sourceErrors.length < MAX_TRACE_SOURCE_ERRORS) {
        const sourceId = /^[a-z0-9-]{1,40}$/.test(source.id) ? source.id : "unknown";
        sourceErrors.push({ source: sourceId, code: traceErrorCode(error) });
      }
    }
  }
  results.sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  return { sessions: opts.limit !== undefined ? results.slice(0, opts.limit) : results, sourceErrors };
}

export async function findTraceRef(tool: string, id: string, opts: TraceListOptions = {}): Promise<TraceSessionRef | null> {
  const source = traceSource(tool);
  if (!source) return null;
  const refs = await source.list(opts);
  return refs.find((ref) => ref.id === id) ?? null;
}

export async function latestTraceRef(opts: TraceListOptions = {}): Promise<TraceSessionRef | null> {
  const refs = await listTraceSessions({ ...opts, limit: 1 });
  return refs[0] ?? null;
}

export async function loadTraceByRef(ref: TraceSessionRef, opts?: TraceLoadOptions): Promise<SessionTrace> {
  const source = traceSource(ref.tool);
  if (!source) throw new Error(`No trace reader for harness "${ref.tool}"`);
  return source.load(ref, opts);
}

export async function loadLatestTrace(opts: TraceListOptions & TraceLoadOptions = {}): Promise<SessionTrace | null> {
  const ref = await latestTraceRef(opts);
  if (!ref) return null;
  return loadTraceByRef(ref, opts);
}
