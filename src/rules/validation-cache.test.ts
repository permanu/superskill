// SPDX-License-Identifier: Apache-2.0
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalogFingerprint, defaultCatalogCachePath, validateCatalogCached } from "./validation-cache.js";

describe("catalog validation cache", () => {
  let root: string;
  let catalog: string;
  let cachePath: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "rules-cache-"));
    catalog = join(root, "catalog");
    cachePath = join(root, "cache", "rules-validation.json");
    await mkdir(join(catalog, "typescript"), { recursive: true });
    await writeFile(join(catalog, "typescript", "INDEX.md"), "# Typescript\n", "utf-8");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("produces a stable fingerprint and changes when the tree changes", async () => {
    const first = await catalogFingerprint(catalog);
    expect(await catalogFingerprint(catalog)).toBe(first);

    await writeFile(join(catalog, "typescript", "rule-a.md"), "# rule a\n", "utf-8");
    const second = await catalogFingerprint(catalog);
    expect(second).not.toBe(first);

    await writeFile(join(catalog, "typescript", "rule-a.md"), "# rule a changed\n", "utf-8");
    expect(await catalogFingerprint(catalog)).not.toBe(second);
  });

  it("validates once, then serves the cached summary while the tree is unchanged", async () => {
    const first = await validateCatalogCached(catalog, cachePath);
    expect(first.cached).toBe(false);

    const second = await validateCatalogCached(catalog, cachePath);
    expect(second.cached).toBe(true);
    expect(second.report).toEqual(first.report);
    expect(second.checkedAt).toBe(first.checkedAt);
  });

  it("serves a matching cache entry without re-validating", async () => {
    const fingerprint = await catalogFingerprint(catalog);
    const checkedAt = new Date().toISOString();
    await mkdir(join(root, "cache"), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify({
        v: 2,
        catalogRoot: catalog,
        fingerprint,
        checkedAt,
        report: { ruleCount: 999, checkedCount: 999, errorCount: 7, warningCount: 3 },
      }),
      "utf-8",
    );

    const outcome = await validateCatalogCached(catalog, cachePath);
    expect(outcome.cached).toBe(true);
    expect(outcome.report).toEqual({ ruleCount: 999, checkedCount: 999, errorCount: 7, warningCount: 3 });
  });

  it("re-validates when the tree changes", async () => {
    await validateCatalogCached(catalog, cachePath);
    await writeFile(join(catalog, "typescript", "new.md"), "# new\n", "utf-8");

    const outcome = await validateCatalogCached(catalog, cachePath);
    expect(outcome.cached).toBe(false);
    expect((await validateCatalogCached(catalog, cachePath)).cached).toBe(true);
  });

  it("invalidates cached results from older validator semantics", async () => {
    await validateCatalogCached(catalog, cachePath);
    const cached = JSON.parse(await readFile(cachePath, "utf-8"));
    await writeFile(cachePath, JSON.stringify({ ...cached, v: 1 }));
    expect((await validateCatalogCached(catalog, cachePath)).cached).toBe(false);
  });

  it("recovers from a corrupt cache file", async () => {
    await mkdir(join(root, "cache"), { recursive: true });
    await writeFile(cachePath, "{ not json", "utf-8");

    const outcome = await validateCatalogCached(catalog, cachePath);
    expect(outcome.cached).toBe(false);
    expect(JSON.parse(await readFile(cachePath, "utf-8")).report).toEqual(outcome.report);
  });

  it("names the default cache path under ~/.superskill/cache", () => {
    expect(defaultCatalogCachePath().endsWith(join(".superskill", "cache", "rules-validation.json"))).toBe(true);
  });
});
