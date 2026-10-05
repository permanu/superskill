import { describe, it, expect } from "vitest";
import {
  emptySpec,
  hashSpec,
  normalizeAcceptance,
  parseAcceptanceItem,
  parseSpec,
  renderSpec,
  specGaps,
  validateAcceptance,
  validateSpec,
  type Spec,
} from "./spec.js";

function completeSpec(): Spec {
  return {
    goal: "Ship the gates pipeline",
    non_goals: ["No UI"],
    constraints: ["Node 22", "No new dependencies"],
    context: "Agents drift without machine-checkable intent.",
    files: { allowed: ["src/lib/gates/**"], forbidden: ["src/rules/**"] },
    acceptance: [
      { id: "A1", text: "tsc is clean", command: "npx tsc --noEmit" },
      { id: "A2", text: "Looks right", manual: "visual inspection" },
    ],
    risks: ["Over-strict gates"],
    rollback: "Revert the commit.",
  };
}

describe("spec parse/render", () => {
  it("round-trips a complete spec", () => {
    const spec = completeSpec();
    expect(parseSpec(renderSpec(spec))).toEqual(spec);
  });

  it("round-trips a spec with a title", () => {
    const spec = completeSpec();
    const body = renderSpec(spec, "Gates Pipeline");
    expect(body).toContain("# Gates Pipeline");
    expect(parseSpec(body)).toEqual(spec);
  });

  it("renders fixed headers", () => {
    const body = renderSpec(emptySpec());
    for (const header of ["## Goal", "## Non-Goals", "## Constraints", "## Context", "## Files", "## Acceptance", "## Risks", "## Rollback"]) {
      expect(body).toContain(header);
    }
    expect(body).toContain("### Allowed");
    expect(body).toContain("### Forbidden");
  });

  it("parses missing sections as empty", () => {
    expect(parseSpec("# Just a title\n")).toEqual(emptySpec());
  });

  it("parses empty acceptance text with a command", () => {
    const body = "## Acceptance\n\n- [ ] A1:  | run: npm test\n";
    expect(parseSpec(body).acceptance).toEqual([{ id: "A1", text: "", command: "npm test" }]);
  });

  it("ignores malformed acceptance lines", () => {
    const body = "## Acceptance\n\n- A1: no checkbox\n- [ ] B1: has one | manual: ok\n";
    expect(parseSpec(body).acceptance).toEqual([{ id: "B1", text: "has one", manual: "ok" }]);
  });
});

describe("acceptance helpers", () => {
  it("normalizes strings with auto ids", () => {
    expect(normalizeAcceptance(["first", "second"])).toEqual([
      { id: "A1", text: "first" },
      { id: "A2", text: "second" },
    ]);
  });

  it("preserves explicit ids and trims values", () => {
    expect(normalizeAcceptance([{ id: " C1 ", text: " check ", command: " npm test " }])).toEqual([
      { id: "C1", text: "check", command: "npm test" },
    ]);
  });

  it("parses CLI acceptance strings", () => {
    expect(parseAcceptanceItem("tests pass | run: npm test")).toEqual({ text: "tests pass", command: "npm test" });
    expect(parseAcceptanceItem("looks right | manual: needs eyes")).toEqual({ text: "looks right", manual: "needs eyes" });
    expect(parseAcceptanceItem("plain text")).toBe("plain text");
  });
});

describe("validateSpec", () => {
  it("accepts a complete spec", () => {
    expect(validateSpec(completeSpec())).toEqual([]);
  });

  it("rejects acceptance items without command or manual", () => {
    const spec = completeSpec();
    spec.acceptance.push({ id: "A3", text: "unmarked" });
    expect(validateSpec(spec)).toContain(
      'Acceptance A3: needs an executable command or a "manual: <reason>" annotation',
    );
  });

  it("rejects empty manual reasons", () => {
    expect(validateAcceptance([{ id: "A1", text: "x", manual: "" }])).toContain(
      "Acceptance A1: manual reason must not be empty",
    );
  });

  it("rejects duplicate ids", () => {
    expect(
      validateAcceptance([
        { id: "A1", text: "x", command: "a" },
        { id: "A1", text: "y", command: "b" },
      ]),
    ).toContain("Duplicate acceptance id: A1");
  });

  it("rejects marker text and newlines", () => {
    const errors = validateAcceptance([{ id: "A1", text: "x | run: evil", command: "a" }]);
    expect(errors).toContain('Acceptance A1: text must not contain "| run:" or "| manual:"');
    expect(validateAcceptance([{ id: "A2", text: "x", command: "a\nb" }])).toContain(
      "Acceptance A2: values must be single-line",
    );
  });
});

describe("specGaps", () => {
  it("reports every missing field for an empty spec", () => {
    const fields = specGaps(emptySpec()).map((gap) => gap.field);
    expect(fields).toEqual([
      "goal",
      "non_goals",
      "constraints",
      "context",
      "files.allowed",
      "files.forbidden",
      "acceptance",
      "risks",
      "rollback",
    ]);
  });

  it("reports unmarked acceptance items", () => {
    const spec = completeSpec();
    spec.acceptance = [{ id: "A1", text: "unmarked" }];
    expect(specGaps(spec)).toEqual([
      { field: "acceptance.A1", reason: "no executable command or manual reason" },
    ]);
  });

  it("returns nothing for a complete spec", () => {
    expect(specGaps(completeSpec())).toEqual([]);
  });
});

describe("hashSpec", () => {
  it("is deterministic", () => {
    expect(hashSpec(completeSpec())).toBe(hashSpec(completeSpec()));
  });

  it("changes when content changes", () => {
    const changed = completeSpec();
    changed.goal = "Different";
    expect(hashSpec(changed)).not.toBe(hashSpec(completeSpec()));
  });

  it("is stable across render and parse", () => {
    const spec = completeSpec();
    expect(hashSpec(parseSpec(renderSpec(spec)))).toBe(hashSpec(spec));
  });

  it("ignores surrounding whitespace", () => {
    const padded = completeSpec();
    padded.goal = `  ${padded.goal}  `;
    padded.risks = padded.risks.map((risk) => ` ${risk} `);
    expect(hashSpec(padded)).toBe(hashSpec(completeSpec()));
  });
});
