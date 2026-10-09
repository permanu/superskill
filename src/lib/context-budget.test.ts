// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { getPhaseBudget, getSkillBudget, fitSkillsToBudget } from "./context-budget.js";

describe("getPhaseBudget", () => {
  it("returns 10% for explore phase", () => {
    const result = getPhaseBudget("explore");
    expect(result.totalBudget).toBe(12_800);
    expect(result.contextWindow).toBe(128_000);
    expect(result.phase).toBe("explore");
  });

  it("returns 15% for implement phase", () => {
    const result = getPhaseBudget("implement");
    expect(result.totalBudget).toBe(19_200);
    expect(result.phase).toBe("implement");
  });

  it("returns 8% for review phase", () => {
    const result = getPhaseBudget("review");
    expect(result.totalBudget).toBe(10_240);
    expect(result.phase).toBe("review");
  });

  it("returns 5% for ship phase", () => {
    const result = getPhaseBudget("ship");
    expect(result.totalBudget).toBe(6_400);
    expect(result.phase).toBe("ship");
  });

  it("clamps to MIN_BUDGET_TOKENS for tiny context windows", () => {
    const result = getPhaseBudget("explore", 4_000);
    expect(result.totalBudget).toBe(2_000);
  });

  it("clamps to MAX_BUDGET_TOKENS for very large context windows", () => {
    const result = getPhaseBudget("implement", 1_000_000);
    expect(result.totalBudget).toBe(50_000);
  });
});

describe("getSkillBudget", () => {
  it("returns 15% of default 128k context window (clamped)", () => {
    const result = getSkillBudget();
    expect(result.totalBudget).toBe(19_200);
    expect(result.contextWindow).toBe(128_000);
  });

  it("clamps to MIN_BUDGET_TOKENS for tiny context windows", () => {
    const result = getSkillBudget(4_000);
    expect(result.totalBudget).toBe(2_000);
  });

  it("clamps to MAX_BUDGET_TOKENS for very large context windows", () => {
    const result = getSkillBudget(1_000_000);
    expect(result.totalBudget).toBe(50_000);
  });

  it("accepts a custom context window", () => {
    const result = getSkillBudget(200_000);
    expect(result.totalBudget).toBe(30_000);
    expect(result.contextWindow).toBe(200_000);
  });
});

describe("fitSkillsToBudget", () => {
  it("accounts for separators in the content budget", () => {
    const result = fitSkillsToBudget([{ id: "a", content: "abcd" }, { id: "b", content: "efgh" }], 4, "\n\n---\n\n");
    expect(result.items.map((item) => item.id)).toEqual(["a"]);
    expect(result.usedTokens).toBe(2);
  });
  const item = (id: string, content: string) => ({ id, content });

  it("includes all items when they fit", () => {
    const items = [item("a", "short"), item("b", "also short")];
    const result = fitSkillsToBudget(items, 10_000);
    expect(result.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.dropped).toEqual([]);
    expect(result.usedTokens).toBeGreaterThan(0);
  });

  it("drops items that exceed the remaining budget", () => {
    const big = "a".repeat(4000);
    const items = [item("a", big), item("b", big), item("c", big)];
    const result = fitSkillsToBudget(items, 2000);
    expect(result.items.map((i) => i.id)).toEqual(["a"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["b", "c"]);
  });

  it("continues packing after an oversized item", () => {
    const small = "a".repeat(100);
    const big = "a".repeat(4000);
    const items = [item("a", small), item("big", big), item("c", small)];
    const result = fitSkillsToBudget(items, 100);
    expect(result.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result.usedTokens).toBe(58);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].id).toBe("big");
    expect(result.dropped[0].tokens).toBe(1150);
    expect(result.dropped[0].reason).toContain("total budget");
  });

  it("reports the remaining-budget reason for items that no longer fit", () => {
    const small = "a".repeat(100);
    const items = [item("a", small), item("b", small), item("c", small)];
    const result = fitSkillsToBudget(items, 50);
    expect(result.items.map((i) => i.id)).toEqual(["a"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["b", "c"]);
    expect(result.dropped[0].reason).toContain("remaining budget");
  });

  it("preserves priority order — earlier items preferred", () => {
    const small = "a".repeat(100);
    const big = "a".repeat(4000);
    const items = [item("a", small), item("b", big), item("c", small)];
    const result = fitSkillsToBudget(items, 1200);
    expect(result.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.dropped.map((d) => d.id)).toEqual(["c"]);
    expect(result.usedTokens).toBe(1179);
  });

  it("drops everything for zero budget", () => {
    const items = [item("a", "hello")];
    const result = fitSkillsToBudget(items, 0);
    expect(result.items).toEqual([]);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].id).toBe("a");
    expect(result.usedTokens).toBe(0);
  });

  it("handles empty item arrays", () => {
    const result = fitSkillsToBudget([], 10_000);
    expect(result.items).toEqual([]);
    expect(result.dropped).toEqual([]);
    expect(result.usedTokens).toBe(0);
  });

  it("is deterministic across repeated calls", () => {
    const small = "a".repeat(100);
    const big = "a".repeat(4000);
    const items = [item("a", small), item("big", big), item("c", small)];
    const first = fitSkillsToBudget(items, 100);
    const second = fitSkillsToBudget(items, 100);
    expect(second).toEqual(first);
    expect(items.map((i) => i.id)).toEqual(["a", "big", "c"]);
  });
});
