// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { CampaignPlan } from "./queue.js";
import { countPrefixes, reconcileState, revisePlan } from "./reconcile.js";
import type { ScannedRule } from "./status.js";

const plan: CampaignPlan = {
  version: 1,
  contract: "docs/authoring/CONTRACT.md",
  languages: [
    { lang: "rust", baseline: "latest", target: 20, batches: 2 },
    { lang: "typescript", baseline: "latest", target: 15, batches: 1 },
  ],
  batches: [
    { id: "rust/own", lang: "rust", prefix: "own", title: "Ownership", target: 12 },
    { id: "rust/clo", lang: "rust", prefix: "clo", title: "Closures", target: 5 },
    { id: "typescript/gen", lang: "typescript", prefix: "gen", title: "Generics", target: 15 },
  ],
  nonContent: [{ id: "telemetry", title: "Telemetry" }],
};

const rules: ScannedRule[] = [
  { lang: "rust", file: "own-a.md", prefix: "own", status: "verified" },
  { lang: "rust", file: "own-b.md", prefix: "own", status: "verified" },
  { lang: "rust", file: "own-draft.md", prefix: "own", status: "draft" },
  { lang: "rust", file: "closure-a.md", prefix: "closure", status: "verified" },
  { lang: "typescript", file: "mod-a.md", prefix: "mod", status: "verified" },
];

const titles = new Map([
  ["rust/closure", "Closures"],
  ["typescript/mod", "Modules and packages"],
]);

describe("countPrefixes", () => {
  it("counts disk and verified totals per lang/prefix", () => {
    const counts = countPrefixes(rules);
    expect(counts.get("rust/own")).toEqual({ disk: 3, verified: 2 });
    expect(counts.get("rust/closure")).toEqual({ disk: 1, verified: 1 });
    expect(counts.get("typescript/mod")).toEqual({ disk: 1, verified: 1 });
  });
});

describe("revisePlan", () => {
  it("appends delivered prefixes the plan is missing and resets language targets", () => {
    const { plan: revised, added } = revisePlan(plan, rules, titles, "2026-10-05T00:00:00.000Z");
    expect(added).toEqual(["rust/closure", "typescript/mod"]);
    const closure = revised.batches.find((batch) => batch.id === "rust/closure");
    expect(closure).toMatchObject({ title: "Closures", target: 1 });
    const mod = revised.batches.find((batch) => batch.id === "typescript/mod");
    expect(mod).toMatchObject({ title: "Modules and packages", target: 1 });
    expect(revised.languages.find((l) => l.lang === "rust")?.target).toBe(3);
    expect(revised.languages.find((l) => l.lang === "typescript")?.target).toBe(1);
    expect(revised.targetTotal).toBe(12 + 5 + 15 + 1 + 1);
    expect(revised.revision).toBe(2);
  });

  it("is idempotent once the plan covers the delivered prefixes", () => {
    const first = revisePlan(plan, rules, titles, "2026-10-05T00:00:00.000Z");
    const second = revisePlan(first.plan, rules, titles, "2026-10-05T00:00:00.000Z");
    expect(second.added).toEqual([]);
    expect(second.plan.batches).toHaveLength(first.plan.batches.length);
  });
});

describe("reconcileState", () => {
  it("marks delivered batches done and missing prefixes superseded", () => {
    const state = reconcileState(plan, rules, { now: new Date("2026-10-05T00:00:00.000Z") });
    expect(state.batches["rust/own"]).toMatchObject({ status: "done", completed_at: "2026-10-05T00:00:00.000Z" });
    expect(state.batches["rust/own"].note).toContain("2 verified");
    expect(state.batches["rust/clo"]).toMatchObject({ status: "superseded" });
    expect(state.batches["rust/clo"].note).toContain("no verified rules");
    expect(state.batches["typescript/gen"]).toMatchObject({ status: "superseded" });
  });

  it("uses the revised plan so renamed prefixes land as done", () => {
    const { plan: revised } = revisePlan(plan, rules, titles, "2026-10-05T00:00:00.000Z");
    const state = reconcileState(revised, rules, {
      now: new Date("2026-10-05T00:00:00.000Z"),
      workstreams: { telemetry: { status: "done", completed_at: "2026-10-05T00:00:00.000Z" } },
    });
    expect(state.batches["rust/closure"]).toMatchObject({ status: "done" });
    expect(state.batches["typescript/mod"]).toMatchObject({ status: "done" });
    expect(state.workstreams.telemetry.status).toBe("done");
  });
});
