import { describe, expect, it } from "vitest";
import { estimateTokens } from "../lib/token-estimator.js";
import { estimateRuleTokens, packBudget } from "./select.js";

describe("estimateRuleTokens", () => {
  it("estimates title plus body with the shared estimator", () => {
    const rule = { title: "Parse input", body: "## Why\n\nExternal data is unknown." };
    expect(estimateRuleTokens(rule)).toBe(estimateTokens(`${rule.title}\n${rule.body}`));
    expect(estimateRuleTokens({ title: "", body: "" })).toBe(estimateTokens("\n"));
  });

  it("grows with content length", () => {
    const small = estimateRuleTokens({ title: "t", body: "short" });
    const large = estimateRuleTokens({ title: "t", body: "x".repeat(4000) });
    expect(large).toBeGreaterThan(small);
  });
});

describe("packBudget", () => {
  const item = (id: string, tokens: number) => ({ id, tokens });

  it("picks items in order while they fit", () => {
    const result = packBudget([item("a", 10), item("b", 20), item("c", 30)], 45);
    expect(result.picked.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(result.dropped).toEqual([{ id: "c", reason: "budget", tokens: 30 }]);
    expect(result.allocated).toBe(45);
    expect(result.used).toBe(30);
  });

  it("marks entries larger than the cap oversized and continues", () => {
    const result = packBudget([item("huge", 100), item("small", 10)], 50);
    expect(result.picked.map((entry) => entry.id)).toEqual(["small"]);
    expect(result.dropped).toEqual([{ id: "huge", reason: "oversized", tokens: 100 }]);
    expect(result.used).toBe(10);
  });

  it("never drops an entry that exactly fills the remaining budget", () => {
    const result = packBudget([item("a", 25), item("b", 25)], 50);
    expect(result.picked.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(result.dropped).toEqual([]);
    expect(result.used).toBe(50);
  });

  it("treats a zero budget as fitting only zero-token entries", () => {
    const result = packBudget([item("zero", 0), item("one", 1)], 0);
    expect(result.picked.map((entry) => entry.id)).toEqual(["zero"]);
    expect(result.dropped).toEqual([{ id: "one", reason: "oversized", tokens: 1 }]);
  });

  it("is deterministic", () => {
    const items = [item("a", 10), item("b", 100), item("c", 20)];
    expect(packBudget(items, 50)).toEqual(packBudget(items, 50));
  });

  it("floors fractional budgets and token counts", () => {
    const result = packBudget([item("a", 10.9)], 10.5);
    expect(result.allocated).toBe(10);
    expect(result.picked.map((entry) => entry.id)).toEqual(["a"]);
    expect(result.used).toBe(10);
  });

  it("handles non-finite budgets and token counts", () => {
    const result = packBudget([item("a", Number.NaN), item("b", 1)], Number.NaN);
    expect(result.allocated).toBe(0);
    expect(result.picked.map((entry) => entry.id)).toEqual(["a"]);
    expect(result.dropped).toEqual([{ id: "b", reason: "oversized", tokens: 1 }]);
  });
});
