// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it } from "vitest";
import { loadRules } from "./loader.js";
import { buildIndex, type RulesIndex } from "./index-builder.js";
import { route } from "./router.js";

let index: RulesIndex;
beforeAll(async () => { index = buildIndex((await loadRules()).rules); });

describe("atomic security and financial rule retrieval", () => {
  it.each([
    ["protect the project jail for vault reads", "typescript-sec-project-scope"],
    ["add a leakage test for test artifacts", "typescript-test-sensitive-output"],
    ["validate an idempotency key on payment retry", "typescript-data-idempotency-payload"],
    ["validate ledger postings for double entry", "typescript-data-balanced-postings"],
  ])("loads the specific verified decision for %s", (prompt, id) => {
    const plan = route({ prompt, stack: ["typescript"], phase: "implement" }, index, { budgetTokens: 6000 });
    expect(plan.rules.some(rule => rule.id === id)).toBe(true);
    expect(index.byId.get(id)?.status).toBe("verified");
  });

  it("does not load the new rules for an unrelated general-purpose task", () => {
    const plan = route({ prompt: "rename a UI color", stack: ["typescript"], files: ["button.ts"], phase: "implement" }, index);
    expect(plan.rules.some(rule => /(?:sec-project-scope|test-sensitive-output|data-idempotency-payload|data-balanced-postings)$/.test(rule.id))).toBe(false);
  });

  it("keeps TypeScript implementations out of other language contexts", () => {
    const plan = route({ prompt: "validate ledger postings and an idempotency key", stack: ["python"], files: ["ledger.py"] }, index);
    expect(plan.rules.some(rule => rule.id.startsWith("typescript-"))).toBe(false);
  });

  it("retrieves by a discriminative active file without loading an entire language pack", () => {
    const plan = route({ prompt: "review this change", stack: ["typescript"], files: ["src/ledger/post.ts"] }, index);
    expect(plan.rules.some(rule => rule.id === "typescript-data-balanced-postings")).toBe(true);
    expect(plan.rules.length).toBeLessThan(20);
  });
});
