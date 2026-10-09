import { describe, expect, it } from "vitest";
import { compactActivationResult, type ActivateResult } from "./activate.js";
import { estimateTokens } from "../../lib/token-estimator.js";

function result(): ActivateResult {
  return {
    success: true,
    skills_loaded: [],
    content: "Delivered context",
    matched_skill_ids: [],
    total_tokens: 5,
    usedTokens: 5,
    allocatedTokens: 1200,
    dropped: [],
    warnings: [],
    rules_plan: { selected: [], explain: [], dropped: [], budget: { allocated: 1200, used: 0 } },
    principles_plan: { selected: [], explain: [], budget: { allocated: 1200, used: 0 } },
  };
}

describe("compactActivationResult diagnostics", () => {
  it("bounds large diagnostic collections and reports the omitted detail without mutating the full result", () => {
    const full = result();
    full.dropped = Array.from({ length: 500 }, (_, i) => ({ id: `rule-${i}-${"x".repeat(1000)}`, reason: "budget", tokens: 100 }));
    full.warnings = Array.from({ length: 500 }, (_, i) => `WARN: diagnostic ${i} ${"x".repeat(1000)}`);
    const original = structuredClone(full);
    const compact = compactActivationResult(full);
    expect(compact.dropped).toHaveLength(8);
    expect(compact.warnings).toHaveLength(3);
    expect(compact.dropped_count).toBe(500);
    expect(compact.warnings_count).toBe(500);
    expect(compact.diagnostics_truncated).toBe(true);
    expect(compact.budget.response_estimated_tokens).toBeLessThan(1000);
    expect(compact.budget.response_estimated_tokens).toBe(estimateTokens(JSON.stringify(compact)));
    expect(compact.content).toBe(full.content);
    expect(full).toEqual(original);
  });

  it("prioritizes blocked safety warnings and preserves the failure error", () => {
    const full = result();
    full.success = false;
    full.error = "Explicit requested skill was blocked by security audit";
    full.warnings = ["ordinary 1", "ordinary 2", "ordinary 3", "BLOCKED: unsafe skill", "WARN: medium-risk audit findings"];
    const compact = compactActivationResult(full);
    expect(compact.warnings[0]).toBe("BLOCKED: unsafe skill");
    expect(compact.warnings).toContain("WARN: medium-risk audit findings");
    expect(compact.error).toBe(full.error);
    expect(compact.diagnostics_truncated).toBe(true);
  });

  it("marks complete short diagnostics and counts unique dropped IDs", () => {
    const full = result();
    full.dropped = [{ id: "a", reason: "budget", tokens: 4 }, { id: "a", reason: "missing", tokens: 0 }];
    full.warnings = ["WARN: one"];
    const compact = compactActivationResult(full);
    expect(compact.dropped).toEqual(["a"]);
    expect(compact.dropped_count).toBe(1);
    expect(compact.warnings_count).toBe(1);
    expect(compact.diagnostics_truncated).toBe(false);
  });
});
