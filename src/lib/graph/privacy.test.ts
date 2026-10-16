// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { minimizeTaskHistory, taskHistoryLabel } from "./privacy.js";
import type { Graph } from "./schema.js";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => vi.stubEnv("SUPERSKILL_RETAIN_TASK_TEXT", "0"));
describe("automatic task-history minimization", () => {
  it("keeps private task text out of persisted labels while preserving process-local deduplication", () => {
    const task = "synthetic private task canary";
    const label = taskHistoryLabel(task);
    expect(label.includes(task)).toBe(false);
    expect(taskHistoryLabel(task)).toBe(label);
    expect(taskHistoryLabel(label)).toBe(label);
    expect(taskHistoryLabel("different task")).not.toBe(label);
  });
  it("minimizes legacy graph intents without mutating the caller's graph", () => {
    const graph: Graph = { nodes: [{ type: "session", id: "old", intent: "synthetic prior task", skills: [], files: [], insights: [], outcome: null, ts: 1 }], edges: [] };
    const minimized = minimizeTaskHistory(graph);
    expect(JSON.stringify(minimized).includes("synthetic prior task")).toBe(false);
    expect(JSON.stringify(graph).includes("synthetic prior task")).toBe(true);
  });
  it("requires explicit opt-in and rejects credentials and invalid settings", () => {
    vi.stubEnv("SUPERSKILL_RETAIN_TASK_TEXT", "1");
    expect(taskHistoryLabel("fix timeout")).toBe("fix timeout");
    expect(() => taskHistoryLabel(`token=${"x".repeat(24)}`)).toThrow("potential credentials");
    vi.stubEnv("SUPERSKILL_RETAIN_TASK_TEXT", "true");
    expect(() => taskHistoryLabel("private")).toThrow("must be 0 or 1");
  });
});
