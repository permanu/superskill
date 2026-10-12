// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { auditHasFailure, auditIsBlocked, auditIsUnknown, auditIsWarn } from "./security-gate.js";

const pass = { gen: "pass", socket: "pass", snyk: "pass" } as const;

describe("audit gates", () => {
  it("blocks fail, unknown, and missing audits (fail-closed)", () => {
    expect(auditIsBlocked({ ...pass, socket: "fail" })).toBe(true);
    expect(auditIsBlocked({ ...pass, gen: "unknown" })).toBe(true);
    expect(auditIsBlocked({ gen: "unknown", socket: "unknown", snyk: "unknown" })).toBe(true);
    expect(auditIsBlocked(null)).toBe(true);
    expect(auditIsBlocked(undefined)).toBe(true);
    expect(auditIsBlocked(pass)).toBe(false);
    expect(auditIsBlocked({ ...pass, snyk: "warn" })).toBe(false);
  });

  it("flags warnings without blocking them", () => {
    expect(auditIsWarn({ ...pass, snyk: "warn" })).toBe(true);
    expect(auditIsWarn(pass)).toBe(false);
    expect(auditIsWarn(null)).toBe(false);
  });

  it("detects unknown audits separately from failures", () => {
    expect(auditIsUnknown({ ...pass, gen: "unknown" })).toBe(true);
    expect(auditIsUnknown({ gen: "unknown", socket: "unknown", snyk: "unknown" })).toBe(true);
    expect(auditIsUnknown(null)).toBe(true);
    expect(auditIsUnknown({ ...pass, gen: "fail" })).toBe(false);
    expect(auditIsUnknown(pass)).toBe(false);
  });

  it("only treats explicit failures as hard failures", () => {
    expect(auditHasFailure({ ...pass, snyk: "fail" })).toBe(true);
    expect(auditHasFailure({ gen: "unknown", socket: "unknown", snyk: "unknown" })).toBe(false);
    expect(auditHasFailure(null)).toBe(false);
    expect(auditHasFailure(pass)).toBe(false);
  });
});
