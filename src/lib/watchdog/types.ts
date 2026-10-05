// SPDX-License-Identifier: Apache-2.0

/**
 * Watchdog — session review + environment optimization.
 *
 * The pipeline is deliberately split in two:
 *   trace adapters (per-harness readers) -> normalized SessionTrace
 *   deterministic detectors              -> Findings with evidence
 *   agent judgment (catalog/watchdog)    -> verified proposals
 *   fix engine                           -> quarantined, reversible repairs
 */

export type TraceToolId = string;

export interface TraceSessionRef {
  /** Harness id: opencode | claude-code | codex | ... */
  tool: string;
  /** Harness-native session id. */
  id: string;
  title?: string;
  /** Working directory captured by the harness. */
  project?: string;
  startedAt: number;
  updatedAt?: number;
  /** Where the raw trace lives (for evidence pointers, never copied into vault). */
  storagePath: string;
}

export type TraceCallStatus = "ok" | "error" | "unknown";

export interface TraceToolCall {
  index: number;
  name: string;
  status: TraceCallStatus;
  /** Short summary of the input (command line, file path), capped. */
  inputSummary?: string;
  /** First bytes of an error message, capped; only set for errors. */
  errorText?: string;
  /** Size of the tool output in bytes when known. */
  outputBytes?: number;
  /** File touched when the tool is obviously file-scoped. */
  filePath?: string;
}

export interface TraceTokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
}

export interface SessionTrace {
  ref: TraceSessionRef;
  model?: string;
  provider?: string;
  tokens?: TraceTokens;
  cost?: number;
  /** User prompts in order, capped for privacy. */
  userTurns: string[];
  toolCalls: TraceToolCall[];
  filesRead: string[];
  filesWritten: string[];
  commands: string[];
  /** Session diff summary when the harness records one. */
  diff?: { files: number; additions: number; deletions: number };
  /** Present when the trace came from a vault session note (universal fallback). */
  sessionNotes?: {
    outcome?: string;
    blocked?: string[];
    partiallyCompleted?: string[];
    tasksCompleted?: string[];
    learningsCaptured?: number;
  };
  /** True when the reader hit a cap and the trace is incomplete. */
  truncated: boolean;
}

export type FindingCategory =
  | "navigation"
  | "verification"
  | "tool-economy"
  | "steering"
  | "skills"
  | "plugins"
  | "prompt"
  | "guardrails"
  | "environment";

export type Severity = "critical" | "high" | "medium" | "low";

export interface FindingEvidence {
  source: "trace" | "repo" | "graph" | "env";
  ref: string;
}

export interface Finding {
  /** Stable hash of category+key so recurrence is detectable across digs. */
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  detail: string;
  evidence: FindingEvidence[];
  proposal: string;
  tool?: string;
  sessionId?: string;
  /** How many prior dig reports already contained this finding id. */
  recurrences?: number;
  /** Relative impact signal used for capping noisy categories (e.g. occurrences). */
  weight?: number;
}

export type DigScopeKind = "session" | "window" | "env" | "all";

export interface DigScope {
  kind: DigScopeKind;
  sessionIds: string[];
  tool?: string;
  since?: number;
  project?: string;
}

export interface FindingSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface WatchdogReport {
  id: string;
  kind: "dig";
  scope: DigScope;
  generatedAt: string;
  sessions: number;
  findings: Finding[];
  summary: FindingSummary;
  /** Compact per-session digests for agent reasoning (session/window scopes). */
  digests: string[];
  persistedPath?: string;
}

export type FindingStatus = "open" | "applied" | "dismissed";

export interface StoredFinding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  status: FindingStatus;
  title: string;
  proposal: string;
}

export interface FixAction {
  id: string;
  kind: "mark-finding" | "quarantine-files";
  description: string;
  findingId?: string;
  path?: string;
  fileCount?: number;
  bytes?: number;
  status: "planned" | "applied" | "skipped" | "failed";
  error?: string;
}

export interface FixRunResult {
  action: "fix";
  dryRun: boolean;
  reportId: string;
  reportPath?: string;
  actions: FixAction[];
  applied: number;
  planned: number;
}

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function summarizeFindings(findings: Finding[]): FindingSummary {
  const summary: FindingSummary = { critical: 0, high: 0, medium: 0, low: 0, total: findings.length };
  for (const finding of findings) summary[finding.severity] += 1;
  return summary;
}

export function sortFindings(findings: Finding[]): Finding[] {
  const rank = new Map(SEVERITY_ORDER.map((s, i) => [s, i]));
  return [...findings].sort((a, b) => {
    const bySeverity = (rank.get(a.severity) ?? 9) - (rank.get(b.severity) ?? 9);
    if (bySeverity !== 0) return bySeverity;
    return a.id.localeCompare(b.id);
  });
}
