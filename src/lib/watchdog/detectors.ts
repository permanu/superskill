// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import type { Finding, FindingCategory, Severity, SessionTrace, TraceToolCall } from "./types.js";
import type { RepoContext } from "./repo-context.js";
import { traceHasVerification } from "./repo-context.js";
import { formatBytes, toolCensus, formatDuration } from "./digest.js";

const T = {
  errorLoopMin: 3,
  repeatCallMin: 3,
  navReadMin: 4,
  failedReadMin: 2,
  oversizeBytes: 100 * 1024,
  oversizeMinCount: 3,
  correctionMin: 2,
  staleRefMin: 3,
  steeringTokensMedium: 2000,
  steeringTokensHigh: 5000,
  similarityMinLines: 30,
  similarityThreshold: 0.5,
  deadSkillMinSessions: 3,
};

export function findingId(category: FindingCategory, key: string): string {
  return `f_${createHash("sha1").update(`${category}:${key}`).digest("hex").slice(0, 10)}`;
}

interface FindingInput {
  category: FindingCategory;
  severity: Severity;
  key: string;
  title: string;
  detail: string;
  evidence: Finding["evidence"];
  proposal: string;
  tool?: string;
  sessionId?: string;
  weight?: number;
}

function makeFinding(input: FindingInput): Finding {
  return {
    id: findingId(input.category, input.key),
    category: input.category,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    evidence: input.evidence,
    proposal: input.proposal,
    ...(input.tool !== undefined ? { tool: input.tool } : {}),
    ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    ...(input.weight !== undefined ? { weight: input.weight } : {}),
  };
}

function callLabel(call: TraceToolCall): string {
  return `#${call.index} ${call.name}${call.inputSummary ? ` \`${call.inputSummary}\`` : ""}`;
}

const READ_TOOLS = /^(read|view|open|readfile|file_read)$/i;

export function detectToolErrorLoop(trace: SessionTrace): Finding[] {
  const groups = new Map<string, TraceToolCall[]>();
  for (const call of trace.toolCalls) {
    if (call.status !== "error") continue;
    const key = `${call.name}|${call.inputSignature ?? call.inputSummary ?? ""}`;
    if (key.endsWith("|")) continue;
    const list = groups.get(key) ?? [];
    list.push(call);
    groups.set(key, list);
  }
  const findings: Finding[] = [];
  for (const [key, calls] of groups) {
    if (calls.length < T.errorLoopMin) continue;
    const name = calls[0].name;
    const summary = calls[0].inputSummary ?? "";
    findings.push(makeFinding({
      category: "tool-economy",
      severity: "high",
      key,
      title: `Same failing call repeated ${calls.length}× — ${name}`,
      detail: `\`${summary}\` failed ${calls.length} times. Retrying an identical call usually means the error was not read or the approach was wrong.`,
      evidence: calls.slice(0, 4).map((call) => ({ source: "trace" as const, ref: `${callLabel(call)}${call.errorText ? `: ${call.errorText.slice(0, 120)}` : ""}` })),
      proposal: `Read the first failure, fix the cause, then retry once. If the call has a failing pattern, add a guardrail (lint rule, wrapper script, or preflight check).`,
      tool: trace.ref.tool,
      sessionId: trace.ref.id,
      weight: calls.length,
    }));
  }
  return findings;
}

const POLL_RE = /write_stdin[^)]*chars\s*:\s*(""|'')/;

export function detectRepeatedCalls(trace: SessionTrace): Finding[] {
  const groups = new Map<string, TraceToolCall[]>();
  for (const call of trace.toolCalls) {
    if (!call.inputSummary) continue;
    // Progressive edits to the same file are normal; identical reads/searches/commands are not.
    if (/^(edit|write|patch|multiedit|notebookedit|apply|create)/i.test(call.name)) continue;
    // Empty terminal polls ("wait for output") are a normal interactive pattern, not waste.
    if (POLL_RE.test(call.inputSummary)) continue;
    const key = `${call.name}|${call.inputSignature ?? call.inputSummary}`;
    const list = groups.get(key) ?? [];
    list.push(call);
    groups.set(key, list);
  }
  const findings: Finding[] = [];
  for (const [key, calls] of groups) {
    if (calls.length < T.repeatCallMin) continue;
    const name = calls[0].name;
    const summary = calls[0].inputSummary ?? "";
    findings.push(makeFinding({
      category: "tool-economy",
      severity: "medium",
      key: `repeat:${key}`,
      title: `Identical call made ${calls.length}× — ${name}`,
      detail: `\`${summary}\` ran ${calls.length} times with the same input. Duplicate calls spend tokens without new information.`,
      evidence: calls.slice(0, 4).map((call) => ({ source: "trace" as const, ref: callLabel(call) })),
      proposal: `Run it once and record the result (vault note, comment, or a script that caches), instead of re-deriving it.`,
      tool: trace.ref.tool,
      sessionId: trace.ref.id,
      weight: calls.length,
    }));
  }
  return findings;
}

export function detectNavigationThrash(trace: SessionTrace): Finding[] {
  const reads = new Map<string, number>();
  for (const call of trace.toolCalls) {
    if (call.status !== "ok" || call.filePath === undefined) continue;
    if (!READ_TOOLS.test(call.name) && call.name.toLowerCase() !== "read") continue;
    reads.set(call.filePath, (reads.get(call.filePath) ?? 0) + 1);
  }
  for (const file of trace.filesRead) {
    reads.set(file, Math.max(reads.get(file) ?? 0, 1));
  }
  const written = new Set(trace.filesWritten);
  const findings: Finding[] = [];
  for (const [file, count] of reads) {
    if (count < T.navReadMin || written.has(file)) continue;
    findings.push(makeFinding({
      category: "navigation",
      severity: "medium",
      key: `thrash:${file}`,
      title: `Read the same file ${count}× without editing it — ${file}`,
      detail: `The agent returned to \`${file}\` ${count} times, which usually means the file was hard to locate or its role was unclear.`,
      evidence: [
        { source: "trace", ref: `${count} reads of ${file}` },
        { source: "trace", ref: `session ${trace.ref.tool}:${trace.ref.id}` },
      ],
      proposal: `Add a navigation pointer: one line in AGENTS.md (or a doc it points to) stating what this file is and when to read it.`,
      tool: trace.ref.tool,
      sessionId: trace.ref.id,
    }));
  }
  return findings;
}

export function detectFailedReads(trace: SessionTrace): Finding[] {
  const failed = trace.toolCalls.filter((call) => {
    if (call.status === "error" && (READ_TOOLS.test(call.name) || call.name.toLowerCase() === "read")) return true;
    return call.status === "error" && /ENOENT|no such file|not found/i.test(call.errorText ?? "");
  });
  if (failed.length < T.failedReadMin) return [];
  return [makeFinding({
    category: "navigation",
    severity: "low",
    key: "failed-reads",
    title: `${failed.length} tool calls failed on missing files/paths`,
    detail: `Reads or commands hit nonexistent paths ${failed.length} times.`,
    evidence: failed.slice(0, 5).map((call) => ({ source: "trace" as const, ref: `${callLabel(call)}${call.errorText ? `: ${call.errorText.slice(0, 120)}` : ""}` })),
    proposal: `Fix stale pointers in the docs the agent follows, or add a short "repo map" section listing where things live.`,
    tool: trace.ref.tool,
    sessionId: trace.ref.id,
  })];
}

export function detectVerificationGap(trace: SessionTrace, repo: RepoContext): Finding[] {
  if (trace.filesWritten.length === 0) return [];
  if (repo.checkScripts.length === 0) return [];
  if (traceHasVerification(trace, repo)) return [];
  const candidates = repo.checkScripts.slice(0, 3).map((name) => `npm run ${name}`);
  return [makeFinding({
    category: "verification",
    severity: "high",
    key: "verify-gap",
    title: `${trace.filesWritten.length} files changed, no verification command ran`,
    detail: `The session wrote files but ran none of the repo's checks (${repo.checkScripts.join(", ")}). Changes were committed on trust.`,
    evidence: [
      { source: "trace", ref: `wrote: ${trace.filesWritten.slice(0, 4).join(", ")}${trace.filesWritten.length > 4 ? "…" : ""}` },
      { source: "repo", ref: `available checks: ${candidates.join(" · ")}` },
    ],
    proposal: `Run \`${candidates[0]}\` before calling work done. If it should be automatic, wire it into a pre-commit hook or CI (see watchdog dig --env guardrail findings).`,
    tool: trace.ref.tool,
    sessionId: trace.ref.id,
  })];
}

export function detectOversizeOutputs(trace: SessionTrace): Finding[] {
  const big = trace.toolCalls
    .filter((call) => (call.outputBytes ?? 0) >= T.oversizeBytes)
    .sort((a, b) => (b.outputBytes ?? 0) - (a.outputBytes ?? 0));
  if (big.length < T.oversizeMinCount) return [];
  const totalBytes = big.reduce((sum, call) => sum + (call.outputBytes ?? 0), 0);
  return [makeFinding({
    category: "tool-economy",
    severity: "medium",
    key: "oversize-output",
    title: `${big.length} tool outputs over ${formatBytes(T.oversizeBytes)} (${formatBytes(totalBytes)} total)`,
    detail: `Large outputs flood the context window; the agent pays tokens for bytes it will not use.`,
    evidence: big.slice(0, 4).map((call) => ({ source: "trace" as const, ref: `${callLabel(call)} → ${formatBytes(call.outputBytes ?? 0)}` })),
    proposal: `Narrow the commands (head/grep/--quiet/jq filters) or add a project script that returns a summary instead of the raw dump.`,
    tool: trace.ref.tool,
    sessionId: trace.ref.id,
  })];
}

const CORRECTION_RE = /^\s*(no\b|nope\b|not what|stop\b|actually\b|wait\b|wrong\b|undo\b|revert\b|that's not|you didn'?t|again\b|i said\b)/i;

export function detectPromptCorrections(trace: SessionTrace): Finding[] {
  const corrections = trace.userTurns.filter((turn) => CORRECTION_RE.test(turn));
  if (corrections.length < T.correctionMin) return [];
  return [makeFinding({
    category: "prompt",
    severity: "low",
    key: "prompt-corrections",
    title: `User corrected course ${corrections.length}× mid-session`,
    detail: `Repeated corrections usually mean the task was under-specified at the start, not that the agent was careless.`,
    evidence: corrections.slice(0, 4).map((turn) => ({ source: "trace" as const, ref: `"${turn.slice(0, 140)}"` })),
    proposal: `For this kind of task, front-load alignment: run a grilling pass (pipeline/grill) or write a short spec before implementation.`,
    tool: trace.ref.tool,
    sessionId: trace.ref.id,
  })];
}

export function detectErrorRate(trace: SessionTrace): Finding[] {
  const census = toolCensus(trace);
  if (census.total < 10 || census.errors < 5) return [];
  const ratio = census.errors / census.total;
  if (ratio < 0.15) return [];
  return [makeFinding({
    category: "tool-economy",
    severity: "medium",
    key: "error-rate",
    title: `${census.errors}/${census.total} tool calls errored (${Math.round(ratio * 100)}%)`,
    detail: `A high error rate means the agent was flying blind for ${formatDuration(trace.ref.startedAt, trace.ref.updatedAt)} of work.`,
    evidence: census.byName.filter((entry) => entry.errors > 0).slice(0, 5).map((entry) => ({ source: "trace" as const, ref: `${entry.name}: ${entry.errors} errors / ${entry.count} calls` })),
    proposal: `Improve the feedback loop: wire the failing command into a script with a clear error, or grant read-only access to the missing information source.`,
    tool: trace.ref.tool,
    sessionId: trace.ref.id,
  })];
}

export function detectSessionNoteSignals(trace: SessionTrace): Finding[] {
  const notes = trace.sessionNotes;
  if (!notes) return [];
  const blocked = notes.blocked ?? [];
  const partial = notes.partiallyCompleted ?? [];

  if (blocked.length > 0) {
    return [makeFinding({
      category: "prompt",
      severity: "low",
      key: "note-blocked",
      title: `Session ended blocked (${blocked.length} blocker${blocked.length === 1 ? "" : "s"})`,
      detail: blocked.slice(0, 3).join(" · ").slice(0, 300),
      evidence: blocked.slice(0, 4).map((item) => ({ source: "trace" as const, ref: item })),
      proposal: `Resolve or ticket the blockers before re-running, and split the task so the next session does not inherit the wall.`,
      tool: trace.ref.tool,
      sessionId: trace.ref.id,
    })];
  }
  if (partial.length > 0) {
    return [makeFinding({
      category: "prompt",
      severity: "low",
      key: "note-partial",
      title: `Session ended with ${partial.length} item${partial.length === 1 ? "" : "s"} partially complete`,
      detail: partial.slice(0, 3).join(" · ").slice(0, 300),
      evidence: partial.slice(0, 4).map((item) => ({ source: "trace" as const, ref: item })),
      proposal: `Turn the leftovers into tickets/todos before the next run so they do not get lost or re-done.`,
      tool: trace.ref.tool,
      sessionId: trace.ref.id,
    })];
  }
  return [];
}

export function detectUnguardedRepo(repo: RepoContext): Finding[] {
  if (!repo.isGit) return [];
  const noChecks = repo.checkScripts.length === 0;
  if (!noChecks && (repo.hasCi || repo.hasPreCommit)) return [];
  const missing: string[] = [];
  if (noChecks) missing.push("no lint/typecheck/test script");
  if (!repo.hasCi) missing.push("no CI workflow running checks");
  if (!repo.hasPreCommit) missing.push("no pre-commit hook");
  return [makeFinding({
    category: "guardrails",
    severity: noChecks ? "high" : "medium",
    key: "unguarded-repo",
    title: `Repo has no guardrail: ${missing.join(", ")}`,
    detail: `Nothing runs automatically to catch mechanical mistakes before they land. An unguarded repo is a standing missed opportunity.`,
    evidence: missing.map((item) => ({ source: "repo" as const, ref: item })),
    proposal: `Cheapest first: add a \`check\` script (lint + typecheck + test), then run it in a pre-commit hook and/or CI. Mechanical violations get deterministic checks, not prose rules.`,
  })];
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function pathTokens(content: string): string[] {
  const tokens: string[] = [];
  const re = /`([A-Za-z0-9_@./~-]+\.(?:md|json|toml|ya?ml|ts|tsx|js|mjs|cjs|py|go|rs|swift|sh|java|c|h|cpp))`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const token = match[1];
    if (token.startsWith("http") || token.includes("*") || token.includes("node_modules")) continue;
    if (!tokens.includes(token)) tokens.push(token);
  }
  return tokens;
}

export function detectSteering(repo: RepoContext, homeDir?: string): Finding[] {
  const findings: Finding[] = [];
  const home = homeDir ?? process.env.HOME ?? "";

  for (const file of repo.steering) {
    if (file.estimatedTokens >= T.steeringTokensHigh) {
      findings.push(makeFinding({
        category: "steering",
        severity: "high",
        key: `steering-size:${file.realPath}`,
        title: `Steering file very large: ${file.path} (~${file.estimatedTokens} tokens)`,
        detail: `${file.lines} lines load into every agent turn regardless of task. Every line spends context load; reference material belongs behind pointers.`,
        evidence: [
          { source: "repo", ref: `${file.path}: ${file.lines} lines, ~${file.estimatedTokens} tokens` },
        ],
        proposal: `Keep AGENTS.md/CLAUDE.md for navigation pointers only. Move reference into docs/skills and point at them; push standards to the review flow.`,
      }));
    } else if (file.estimatedTokens >= T.steeringTokensMedium) {
      findings.push(makeFinding({
        category: "steering",
        severity: "medium",
        key: `steering-size:${file.realPath}`,
        title: `Steering file is getting heavy: ${file.path} (~${file.estimatedTokens} tokens)`,
        detail: `${file.lines} lines load on every turn. Look for no-ops and duplicated instructions, and disclose reference behind pointers.`,
        evidence: [{ source: "repo", ref: `${file.path}: ${file.lines} lines, ~${file.estimatedTokens} tokens` }],
        proposal: `Prune no-op lines, collapse duplicated rules into one source of truth, and point at docs for anything only some branches need.`,
      }));
    }

    const tokens = pathTokens(file.content);
    const missing = tokens.filter((token) => {
      if (token.startsWith("~/") || token.startsWith("~")) {
        const expanded = token.replace(/^~/, home);
        return expanded.length > 1 && !existsSync(expanded);
      }
      if (token.startsWith("/")) return !existsSync(token);
      return !existsSync(`${repo.root}/${token}`);
    });
    if (missing.length >= T.staleRefMin) {
      findings.push(makeFinding({
        category: "steering",
        severity: "medium",
        key: `steering-stale:${file.realPath}`,
        title: `${missing.length} referenced paths in ${file.path} do not exist`,
        detail: `Stale pointers send the agent to dead ends, costing navigation time and trust.`,
        evidence: missing.slice(0, 6).map((token) => ({ source: "repo" as const, ref: `missing: ${token}` })),
        proposal: `Update or delete the stale pointers. If a whole section is historical, move it to a doc and keep one live pointer in the steering file.`,
      }));
    }
  }

  const files = repo.steering;
  for (let i = 0; i < files.length; i += 1) {
    for (let j = i + 1; j < files.length; j += 1) {
      const a = files[i];
      const b = files[j];
      if (a.scope === "global" && b.scope === "global") continue;
      const linesA = new Set(a.content.split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter((line) => line.length > 10));
      const linesB = new Set(b.content.split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter((line) => line.length > 10));
      if (linesA.size < T.similarityMinLines || linesB.size < T.similarityMinLines) continue;
      const similarity = jaccard(linesA, linesB);
      if (similarity < T.similarityThreshold) continue;
      findings.push(makeFinding({
        category: "steering",
        severity: "medium",
        key: `steering-dupe:${[a.realPath, b.realPath].sort().join("|")}`,
        title: `Duplicated steering: ${a.path} ≈ ${b.path} (${Math.round(similarity * 100)}% shared lines)`,
        detail: `The same instructions live in two files. Duplication costs maintenance and inflates a meaning's prominence past its real rank.`,
        evidence: [
          { source: "repo", ref: `${a.path} (${a.lines} lines)` },
          { source: "repo", ref: `${b.path} (${b.lines} lines)` },
        ],
        proposal: `Keep one source of truth — usually the project AGENTS.md — and reduce the other to a symlink or pointer.`,
      }));
    }
  }

  return findings;
}
