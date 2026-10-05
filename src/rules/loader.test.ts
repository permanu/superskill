import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadRules } from "./loader.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./__fixtures__/rules/", import.meta.url));

describe("loadRules", () => {
  it("loads every contract-shaped rule and skips malformed files with warnings", async () => {
    const { rules, warnings } = await loadRules(FIXTURE_ROOT);
    expect(rules.map((rule) => rule.id)).toEqual([
      "python-err-specific-except",
      "rust-own-avoid-clone",
      "rust-style-naming",
      "typescript-async-race-draft",
      "typescript-err-parse-boundary",
      "typescript-perf-huge-rule",
      "typescript-type-no-any",
    ]);
    expect(warnings).toHaveLength(2);
    expect(warnings.map((warning) => warning.path)).toEqual([
      "typescript/broken-yaml.md",
      "typescript/missing-fields.md",
    ]);
  });

  it("parses selection fields from frontmatter", async () => {
    const { rules } = await loadRules(FIXTURE_ROOT);
    const rule = rules.find((candidate) => candidate.id === "typescript-err-parse-boundary");
    expect(rule).toMatchObject({
      id: "typescript-err-parse-boundary",
      lang: "typescript",
      prefix: "err",
      title: "Parse external input at the boundary",
      severity: "must",
      enforce: "review",
      status: "verified",
      sourcesCount: 1,
      path: "typescript/err-parse-boundary.md",
    });
    expect(rule?.triggers).toEqual({
      keywords: ["parse", "json", "validate", "boundary"],
      files: ["**/*.ts"],
      symbols: ["JSON.parse"],
    });
    expect(rule?.body).toContain("## Why");
    expect(rule?.body).not.toContain("---");
  });

  it("keeps draft rules loadable but marks their status", async () => {
    const { rules } = await loadRules(FIXTURE_ROOT);
    expect(rules.find((rule) => rule.id === "typescript-async-race-draft")?.status).toBe("draft");
  });

  it("surfaces a parse warning for malformed YAML", async () => {
    const { warnings } = await loadRules(FIXTURE_ROOT);
    const warning = warnings.find((entry) => entry.path === "typescript/broken-yaml.md");
    expect(warning?.message).toContain("invalid YAML frontmatter");
  });

  it("surfaces a warning for missing required fields", async () => {
    const { warnings } = await loadRules(FIXTURE_ROOT);
    const warning = warnings.find((entry) => entry.path === "typescript/missing-fields.md");
    expect(warning?.message).toContain("title");
    expect(warning?.message).toContain("severity");
    expect(warning?.message).toContain("status");
  });

  it("returns an empty result for a missing pack root without throwing", async () => {
    const result = await loadRules(join(FIXTURE_ROOT, "does-not-exist"));
    expect(result).toEqual({ rules: [], warnings: [] });
  });

  it("ignores INDEX.md and sources.md metadata files", async () => {
    const { rules, warnings } = await loadRules(FIXTURE_ROOT);
    expect(rules.some((rule) => rule.path.endsWith("INDEX.md"))).toBe(false);
    expect(warnings.some((warning) => warning.path.includes("INDEX.md"))).toBe(false);
    expect(warnings.some((warning) => warning.path.includes("sources.md"))).toBe(false);
  });

  it("returns rules sorted by id", async () => {
    const { rules } = await loadRules(FIXTURE_ROOT);
    const ids = rules.map((rule) => rule.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("loads a single pack root when pointed at it directly", async () => {
    const { rules, warnings } = await loadRules(join(FIXTURE_ROOT, "rust"));
    expect(rules.map((rule) => rule.id)).toEqual(["rust-own-avoid-clone", "rust-style-naming"]);
    expect(warnings).toEqual([]);
  });
});
