// SPDX-License-Identifier: Apache-2.0
import { parseFrontmatter } from "../../frontmatter.js";
import type { VaultFS } from "../../vault-fs.js";
import type { SessionTrace, TraceSessionRef } from "../types.js";
import { newTrace } from "./source.js";

/**
 * Universal fallback trace source: vault session notes written by `session complete`.
 * Every harness that can call the superskill MCP tool is covered here, even when a
 * dedicated reader for its native log format does not exist yet.
 */

const MAX_NOTES = 40;

export interface VaultTraceListOptions {
  projectSlug?: string | null;
  since?: number;
  limit?: number;
}

export async function listVaultTraces(vaultFs: VaultFS, opts: VaultTraceListOptions = {}): Promise<TraceSessionRef[]> {
  const dirs: string[] = [];
  if (opts.projectSlug) {
    dirs.push(`projects/${opts.projectSlug}/sessions`);
  } else {
    let projects: string[] = [];
    try {
      projects = await vaultFs.list("projects", 1);
    } catch {
      return [];
    }
    for (const entry of projects) {
      if (!entry.endsWith("/")) continue;
      dirs.push(`${entry.replace(/\/$/, "")}/sessions`);
    }
  }

  const refs: TraceSessionRef[] = [];
  for (const dir of dirs) {
    let files: string[];
    try {
      files = await vaultFs.list(dir, 1);
    } catch {
      continue;
    }
    const notes = files
      .filter((file) => file.endsWith(".md"))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, MAX_NOTES);
    for (const path of notes) {
      let parsed: ReturnType<typeof parseFrontmatter>;
      try {
        parsed = parseFrontmatter(await vaultFs.read(path));
      } catch {
        continue;
      }
      const fm = parsed.data;
      if (fm.type !== "session") continue;
      const startedAt = Date.parse(String(fm.started_at ?? fm.created ?? "")) || 0;
      const completedAt = Date.parse(String(fm.completed_at ?? "")) || startedAt;
      if (opts.since !== undefined && completedAt < opts.since) continue;
      refs.push({
        tool: "superskill",
        id: String(fm.session_id ?? path.split("/").pop() ?? path),
        ...(typeof fm.outcome === "string" && fm.outcome.length > 0 ? { title: fm.outcome } : {}),
        ...(typeof fm.project === "string" ? { project: fm.project } : {}),
        startedAt,
        updatedAt: completedAt,
        storagePath: path,
      });
    }
  }

  refs.sort((a, b) => (b.updatedAt ?? b.startedAt) - (a.updatedAt ?? a.startedAt));
  return opts.limit !== undefined ? refs.slice(0, opts.limit) : refs;
}

export async function loadVaultTrace(vaultFs: VaultFS, ref: TraceSessionRef): Promise<SessionTrace> {
  const trace = newTrace(ref);
  let parsed: ReturnType<typeof parseFrontmatter>;
  try {
    parsed = parseFrontmatter(await vaultFs.read(ref.storagePath));
  } catch {
    return trace;
  }
  const fm = parsed.data;

  const filesTouched = Array.isArray(fm.files_touched) ? (fm.files_touched as unknown[]).filter((f): f is string => typeof f === "string") : [];
  trace.filesWritten = filesTouched;
  if (typeof fm.verification_run === "string" && fm.verification_run.length > 0) {
    trace.commands = [fm.verification_run];
  }
  trace.truncated = false;
  trace.sessionNotes = {
    ...(typeof fm.outcome === "string" ? { outcome: fm.outcome } : {}),
    blocked: asStringArray(fm.blocked),
    partiallyCompleted: asStringArray(fm.partially_completed),
    tasksCompleted: asStringArray(fm.tasks_completed),
    learningsCaptured: typeof fm.learnings_captured === "number" ? fm.learnings_captured : 0,
  };
  return trace;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
