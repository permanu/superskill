import { describe, it, expect } from "vitest";
import { planDelegation } from "./orchestrate.js";

describe("planDelegation", () => {
  it("is a single entry and keeps adhd + careful-minimal defaults", () => {
    const p = planDelegation("fix a typo", ["typescript"]);
    expect(p.entry).toBe("superskill");
    expect(p.defaults).toEqual(["adhd-output", "careful-minimal", "algorithm-correct"]);
    expect(p.specialists.map((s) => s.agent)).toContain("typescript");
    expect(p.specialists.map((s) => s.agent)).not.toContain("platform");
    expect(p.specialists.map((s) => s.agent)).not.toContain("qa");
  });

  it("delegates go work to the go specialist", () => {
    const p = planDelegation("add a timeout to the grpc handler", ["go"]);
    expect(p.specialists.some((s) => s.agent === "go" && s.pack === "code/go")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "typescript")).toBe(false);
  });

  it("delegates qa to the qa specialist, not implement", () => {
    const p = planDelegation("qa viz click through the graph", ["typescript"]);
    expect(p.specialists.some((s) => s.agent === "qa")).toBe(true);
    expect(p.specialists.some((s) => s.agent === "typescript")).toBe(false);
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
