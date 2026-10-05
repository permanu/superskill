// SPDX-License-Identifier: Apache-2.0

import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fixturePath } from "./__fixtures__/paths.js";
import { claimPath, parseClaim, parseClaims, verifyClaims, type Claim, type ClaimResult } from "./claims.js";
import { scanRepo } from "./scan.js";
import type { ScanResult } from "./types.js";

const ROOT = fixturePath("claims", "repo");

let scan: ScanResult;

beforeAll(async () => {
  scan = await scanRepo(ROOT);
});

async function verify(claim: Claim): Promise<ClaimResult> {
  const report = await verifyClaims([claim], { root: ROOT, scan });
  return report.claims[0];
}

describe("claimPath", () => {
  it("normalizes repo-relative, absolute, and file: inputs", () => {
    expect(claimPath(ROOT, "./src/alpha.ts")).toBe("src/alpha.ts");
    expect(claimPath(ROOT, "file:src/alpha.ts")).toBe("src/alpha.ts");
    expect(claimPath(ROOT, join(ROOT, "src", "alpha.ts"))).toBe("src/alpha.ts");
    expect(claimPath(ROOT, "src/../src/alpha.ts")).toBe("src/alpha.ts");
  });
});

describe("verifyClaims", () => {
  it("scans the fixture repo without parse errors", () => {
    expect(scan.stats.parseErrors).toBe(0);
    expect(scan.stats.files).toBe(4);
  });

  it("verifies file-exists only for files present in the scan", async () => {
    const present = await verify({ kind: "file-exists", path: "src/alpha.ts" });
    expect(present.verdict).toBe("verified");
    expect(present.evidence[0]).toMatchObject({
      kind: "node",
      id: "file:src/alpha.ts",
      confidence: "EXTRACTED",
    });

    const absolute = await verify({ kind: "file-exists", path: join(ROOT, "src", "beta.ts") });
    expect(absolute.verdict).toBe("verified");
    expect(absolute.evidence[0].id).toBe("file:src/beta.ts");

    const missing = await verify({ kind: "file-exists", path: "src/nope.ts" });
    expect(missing.verdict).toBe("refuted");
    expect(missing.reason).toContain("neither in the graph scan nor on disk");

    const unscanned = await verify({ kind: "file-exists", path: "README.md" });
    expect(unscanned.verdict).toBe("unverifiable");
    expect(unscanned.reason).toContain("not in the graph scan");
  });

  it("verifies symbol-exists by name, optionally scoped to a file", async () => {
    const anywhere = await verify({ kind: "symbol-exists", name: "helper" });
    expect(anywhere.verdict).toBe("verified");
    expect(anywhere.evidence[0].id).toMatch(/^sym:src\/beta\.ts#helper@/);

    const scoped = await verify({ kind: "symbol-exists", name: "helper", file: "src/beta.ts" });
    expect(scoped.verdict).toBe("verified");

    const wrongFile = await verify({ kind: "symbol-exists", name: "helper", file: "src/alpha.ts" });
    expect(wrongFile.verdict).toBe("refuted");
    expect(wrongFile.reason).toContain("no symbol named");

    const ghost = await verify({ kind: "symbol-exists", name: "ghost" });
    expect(ghost.verdict).toBe("refuted");

    const ghostFile = await verify({ kind: "symbol-exists", name: "helper", file: "src/missing.ts" });
    expect(ghostFile.verdict).toBe("refuted");
  });

  it("verifies symbol-exported only on EXTRACTED export markers", async () => {
    const exported = await verify({ kind: "symbol-exported", name: "helper", file: "src/beta.ts" });
    expect(exported.verdict).toBe("verified");
    expect(exported.evidence.some((item) => item.kind === "node" && item.confidence === "EXTRACTED")).toBe(true);
    expect(
      exported.evidence.some((item) => item.kind === "edge" && item.confidence === "EXTRACTED" && item.id?.includes("exports")),
    ).toBe(true);

    const internal = await verify({ kind: "symbol-exported", name: "internal", file: "src/alpha.ts" });
    expect(internal.verdict).toBe("refuted");
    expect(internal.reason).toContain("no EXTRACTED export marker");

    const ghost = await verify({ kind: "symbol-exported", name: "ghost", file: "src/beta.ts" });
    expect(ghost.verdict).toBe("refuted");
  });

  it("treats import resolution as unverifiable because resolution edges are INFERRED", async () => {
    const resolved = await verify({ kind: "import-resolves", from: "src/alpha.ts", specifier: "./beta.js" });
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.reason).toContain("INFERRED");
    expect(
      resolved.evidence.some((item) => item.kind === "edge" && item.confidence === "EXTRACTED"),
    ).toBe(true);
    expect(
      resolved.evidence.some((item) => item.kind === "edge" && item.confidence === "INFERRED"),
    ).toBe(true);
    expect(resolved.evidence.some((item) => item.id === "file:src/beta.ts")).toBe(true);

    const noStatement = await verify({ kind: "import-resolves", from: "src/alpha.ts", specifier: "./missing.js" });
    expect(noStatement.verdict).toBe("refuted");
    expect(noStatement.reason).toContain("no EXTRACTED import");

    const missingFile = await verify({ kind: "import-resolves", from: "src/missing.ts", specifier: "./beta.js" });
    expect(missingFile.verdict).toBe("refuted");
  });

  it("verifies no-other-importers when the scan has no incoming imports edge", async () => {
    const clean = await verify({ kind: "no-other-importers", file: "src/gamma.ts" });
    expect(clean.verdict).toBe("verified");
    expect(clean.evidence[0].id).toBe("file:src/gamma.ts");

    const imported = await verify({ kind: "no-other-importers", file: "src/beta.ts" });
    expect(imported.verdict).toBe("unverifiable");
    expect(imported.reason).toContain("INFERRED");
    expect(imported.evidence).toHaveLength(2);
    expect(imported.evidence.every((item) => item.kind === "edge" && item.confidence === "INFERRED")).toBe(true);

    const missing = await verify({ kind: "no-other-importers", file: "src/missing.ts" });
    expect(missing.verdict).toBe("refuted");
  });

  it("verifies no-other-callers only when no INFERRED call edge points at the symbol", async () => {
    const clean = await verify({ kind: "no-other-callers", symbol: "lonely" });
    expect(clean.verdict).toBe("verified");

    const called = await verify({ kind: "no-other-callers", symbol: "helper" });
    expect(called.verdict).toBe("unverifiable");
    expect(called.reason).toContain("INFERRED");
    expect(called.evidence).toHaveLength(2);
    expect(called.evidence.every((item) => item.kind === "edge" && item.confidence === "INFERRED")).toBe(true);

    const scoped = await verify({ kind: "no-other-callers", symbol: "helper", file: "src/beta.ts" });
    expect(scoped.verdict).toBe("unverifiable");

    const ghost = await verify({ kind: "no-other-callers", symbol: "ghost" });
    expect(ghost.verdict).toBe("refuted");
  });

  it("summarizes verdicts across a batch", async () => {
    const report = await verifyClaims(
      [
        { kind: "file-exists", path: "src/alpha.ts" },
        { kind: "file-exists", path: "src/nope.ts" },
        { kind: "file-exists", path: "README.md" },
      ],
      { root: ROOT, scan },
    );
    expect(report.root).toBe(ROOT);
    expect(report.summary).toEqual({ verified: 1, refuted: 1, unverifiable: 1 });
    expect(report.claims).toHaveLength(3);
  });
});

describe("parseClaims", () => {
  it("rejects unknown kinds and missing fields", () => {
    expect(() => parseClaim({ kind: "nope" })).toThrow(/unknown claim kind/);
    expect(() => parseClaim({ kind: "file-exists" })).toThrow(/requires a non-empty "path"/);
    expect(() => parseClaim({ kind: "import-resolves", from: "a.ts" })).toThrow(/requires a non-empty "specifier"/);
    expect(() => parseClaims("not-an-array")).toThrow(/expected an array/);
    expect(() => parseClaims([null])).toThrow(/must be an object/);
  });

  it("parses optional fields only when present", () => {
    expect(parseClaim({ kind: "symbol-exists", name: "x" })).toEqual({ kind: "symbol-exists", name: "x" });
    expect(parseClaim({ kind: "symbol-exists", name: "x", file: "a.ts" })).toEqual({
      kind: "symbol-exists",
      name: "x",
      file: "a.ts",
    });
    expect(parseClaim({ kind: "no-other-callers", symbol: "y" })).toEqual({
      kind: "no-other-callers",
      symbol: "y",
    });
  });
});
