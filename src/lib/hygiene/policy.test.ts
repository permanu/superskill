// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DEFAULT_HYGIENE_POLICY, defaultScratchRoots, loadHygienePolicy } from "./policy.js";

describe("loadHygienePolicy", () => {
  it("returns the defaults when no override env vars are set", () => {
    expect(loadHygienePolicy({})).toEqual(DEFAULT_HYGIENE_POLICY);
  });

  it("parses finite non-negative overrides", () => {
    const policy = loadHygienePolicy({
      SUPERSKILL_HYGIENE_CACHE_AGE_DAYS: "7",
      SUPERSKILL_HYGIENE_SCRATCH_TTL_HOURS: "24",
      SUPERSKILL_HYGIENE_DOCKER_AGE_DAYS: "3",
    });

    expect(policy.cacheAutoMinAgeDays).toBe(7);
    expect(policy.scratchTtlHours).toBe(24);
    expect(policy.dockerMinAgeDays).toBe(3);
    expect(policy.cacheConsentMinBytes).toBe(DEFAULT_HYGIENE_POLICY.cacheConsentMinBytes);
  });

  it("falls back for non-numeric and negative values", () => {
    const policy = loadHygienePolicy({
      SUPERSKILL_HYGIENE_CACHE_AGE_DAYS: "soon",
      SUPERSKILL_HYGIENE_SCRATCH_TTL_HOURS: "-4",
      SUPERSKILL_HYGIENE_DOCKER_AGE_DAYS: "many",
    });

    expect(policy.cacheAutoMinAgeDays).toBe(DEFAULT_HYGIENE_POLICY.cacheAutoMinAgeDays);
    expect(policy.scratchTtlHours).toBe(DEFAULT_HYGIENE_POLICY.scratchTtlHours);
    expect(policy.dockerMinAgeDays).toBe(DEFAULT_HYGIENE_POLICY.dockerMinAgeDays);
  });
});

describe("defaultScratchRoots", () => {
  it("includes temp, /tmp, and the superskill scratch dir without duplicates", () => {
    const roots = defaultScratchRoots({});

    expect(roots).toContain(resolve(tmpdir()));
    expect(roots).toContain(resolve("/tmp"));
    expect(roots).toContain(resolve(join(homedir(), ".superskill", "scratch")));
    expect(new Set(roots).size).toBe(roots.length);
  });

  it("appends trimmed and resolved extra roots from SUPERSKILL_SCRATCH_ROOTS", () => {
    const roots = defaultScratchRoots({
      SUPERSKILL_SCRATCH_ROOTS: "/one::  /two  : relative/three ",
    });

    expect(roots).toContain("/one");
    expect(roots).toContain("/two");
    expect(roots).toContain(resolve("relative/three"));
  });

  it("dedupes extras that resolve to an existing root", () => {
    const roots = defaultScratchRoots({ SUPERSKILL_SCRATCH_ROOTS: ` ${tmpdir()} :/tmp` });

    expect(roots.filter((root) => root === resolve(tmpdir()))).toHaveLength(1);
    expect(roots.filter((root) => root === resolve("/tmp"))).toHaveLength(1);
  });
});
