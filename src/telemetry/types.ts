// SPDX-License-Identifier: Apache-2.0

/** Persisted opt-in setting for local telemetry (`~/.superskill/telemetry/settings.json`). */
export interface TelemetrySettings {
  enabled: boolean;
  updated_at: string | null;
}

/** One rule-selection activation, appended as a JSONL line. */
export interface ActivationEvent {
  v: 1;
  type: "activation";
  at: string;
  tool: string | null;
  project: string | null;
  task_hash: string;
  phase: string;
  stack: string[];
  langs: string[];
  budget: { allocated: number; used: number };
  selected: string[];
  principles: string[];
  dropped: string[];
  rules_total: number;
}

export type TelemetryEvent = ActivationEvent;
