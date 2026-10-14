import { describe, it, expect } from "vitest";
import { planDelegation } from "./orchestrate.js";
import { loadCatalog } from "./catalog.js";

describe("planDelegation", () => {
  it("is a single entry and keeps catalog-resolvable defaults", () => {
    const p = planDelegation("fix a typo", ["typescript"]);
    expect(p.entry).toBe("superskill");
    expect(p.defaults).toEqual([
      "memory/graph",
      "pipeline/norms",
      "security/index",
    ]);
    expect(p.specialists.map((s) => s.agent)).toContain("typescript");
    expect(p.specialists.map((s) => s.agent)).not.toContain("platform");
    expect(p.specialists.map((s) => s.agent)).not.toContain("qa");
  });

  it("resolves every default to a real catalog artifact", async () => {
    const catalogIds = new Set((await loadCatalog()).map((s) => s.id));
    for (const id of planDelegation("fix a typo").defaults) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it("delegates go work to the go specialist", () => {
    const p = planDelegation("add a timeout to the grpc handler", ["go"]);
    expect(p.specialists.some((s) => s.agent === "go" && s.pack === "code/go")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "typescript")).toBe(false);
  });

  it("does not force grill on a review without a named unresolved decision", () => {
    const p = planDelegation("review this diff", ["typescript"]);
    expect(p.specialists.some((s) => s.agent === "review")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "grill")).toBe(false);
    expect(planDelegation("review this diff and grill the unresolved authorization decision").specialists.some((s) => s.agent === "grill")).toBe(true);
  });

  it("routes application browser QA to UI review, not graph-note QA", () => {
    const p = planDelegation("run browser e2e and click through the settings flow", ["typescript"]);
    expect(p.specialists.some((s) => s.agent === "ui" && s.pack === "ui/review")).toBe(true);
    expect(p.specialists.some((s) => s.pack === "pipeline/qa")).toBe(false);
    expect(p.specialists.some((s) => s.agent === "typescript")).toBe(false);
  });

  it("routes explicit generated graph-note QA narrowly", () => {
    const p = planDelegation("run graph viz to verify generated notes", ["typescript"]);
    expect(p.specialists.some((s) => s.agent === "qa" && s.pack === "pipeline/qa")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "ui")).toBe(false);
    expect(planDelegation("explain Graphviz syntax").specialists.some((s) => s.pack === "pipeline/qa")).toBe(false);
    const byFile = planDelegation("check the output", [], { files: ["src/lib/code-notes.ts"] });
    expect(byFile.specialists.some((s) => s.pack === "pipeline/qa")).toBe(true);
  });

  it("keeps optional algorithm guidance task-triggered", () => {
    const typo = planDelegation("fix typo in README.md");
    expect(typo.defaults).not.toContain("optimizer/algorithm");
    expect(typo.specialists.some((s) => s.pack === "optimizer/algorithm")).toBe(false);
    const concurrency = planDelegation("fix a concurrency algorithm regression", ["typescript"]);
    expect(concurrency.specialists.some((s) => s.pack === "optimizer/algorithm")).toBe(true);
  });

  it("routes a security bug to security + review, not a typo path", () => {
    const p = planDelegation("fix a security bug in session cookies", ["typescript"]);
    expect(p.specialists.some((s) => s.agent === "security")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "review")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "typescript")).toBe(false);
  });

  it("does not force a 10-step chain on a typo", () => {
    const p = planDelegation("fix typo in readme", ["typescript"]);
    expect(p.specialists.length).toBeLessThanOrEqual(2);
    expect(p.loop).toBe(false);
  });
});

describe("routing context", () => {
  it("uses active files before repository language defaults", () => {
    const plan = planDelegation("update the handler", ["typescript", "python"], { files: ["worker.py"] });
    expect(plan.specialists.map(s => s.agent)).toContain("python");
    expect(plan.specialists.map(s => s.agent)).not.toContain("typescript");
  });

  it("recognizes a file language absent from the stored stack", () => {
    expect(planDelegation("update the handler", ["typescript"], { files: ["service.go"] }).specialists.map(s => s.agent)).toContain("go");
  });

  it("reroutes neutral tasks when lifecycle phase changes", () => {
    const review = planDelegation("the current changes", ["typescript"], { phase: "review" });
    expect(review.specialists.map(s => s.agent)).toContain("review");
    expect(review.specialists.map(s => s.agent)).not.toContain("typescript");
    const ship = planDelegation("the current changes", ["typescript"], { phase: "ship" });
    expect(ship.specialists.map(s => s.agent)).toContain("platform");
    expect(ship.specialists.map(s => s.agent)).not.toContain("typescript");
  });
});
