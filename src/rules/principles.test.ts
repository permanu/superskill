// SPDX-License-Identifier: Apache-2.0
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { keywordKeys } from "./index-builder.js";
import type { PlannedPrinciple } from "./plan.js";
import {
  DEFAULT_PRINCIPLE_CAP,
  buildPrincipleIndex,
  formatPrincipleDerivation,
  loadPrinciples,
  selectPrinciples,
} from "./principles.js";
import type { ParsedPrinciple } from "./principles.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./__fixtures__/principles/", import.meta.url));

function principle(overrides: Partial<ParsedPrinciple> & { id: string }): ParsedPrinciple {
  return {
    title: `Title ${overrides.id}`,
    applyWhen: "Apply when testing.",
    enforce: "review",
    status: "verified",
    triggers: { keywords: [], files: [], symbols: [] },
    related: [],
    sourcesCount: 0,
    body: "",
    path: `${overrides.id}.md`,
    ...overrides,
  };
}

describe("loadPrinciples", () => {
  it("loads contract-shaped principles sorted by id and warns on malformed files", async () => {
    const { principles, warnings } = await loadPrinciples(FIXTURE_ROOT);
    expect(principles.map((entry) => entry.id)).toEqual([
      "principle-draft-experiment",
      "principle-evidence-before-done",
      "principle-gate-wire-format",
      "principle-parse-boundary",
      "principle-schema-change",
      "principle-wrong-name",
    ]);
    expect(warnings.map((warning) => warning.path)).toEqual([
      "broken-yaml.md",
      "mismatched-id.md",
      "missing-fields.md",
    ]);
    expect(warnings[0]?.message).toContain("invalid YAML frontmatter");
    expect(warnings[1]?.message).toContain("does not match filename");
    expect(warnings[2]?.message).toContain("apply_when");
    expect(warnings[2]?.message).toContain("status");
  });

  it("parses selection fields from frontmatter", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    const entry = principles.find((candidate) => candidate.id === "principle-parse-boundary");
    expect(entry).toMatchObject({
      id: "principle-parse-boundary",
      title: "Parse external input at the boundary",
      applyWhen: "Apply when external data enters the program.",
      enforce: "review",
      status: "verified",
      sourcesCount: 1,
      related: [],
      path: "parse-boundary.md",
    });
    expect(entry?.triggers).toEqual({
      keywords: ["parse", "boundary", "validate"],
      files: [],
      symbols: ["JSON.parse"],
    });
    expect(entry?.body).toContain("## Patterns");
    expect(entry?.body).not.toContain("id: principle-parse-boundary");
  });

  it("keeps draft principles loadable but marks their status", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    expect(principles.find((entry) => entry.id === "principle-draft-experiment")?.status).toBe("draft");
  });

  it("returns an empty result for a missing root without throwing", async () => {
    const result = await loadPrinciples(join(FIXTURE_ROOT, "does-not-exist"));
    expect(result).toEqual({ principles: [], warnings: [] });
  });

  it("ignores metadata files", async () => {
    const { principles, warnings } = await loadPrinciples(FIXTURE_ROOT);
    expect(principles.some((entry) => entry.path.endsWith("INDEX.md"))).toBe(false);
    expect(warnings.some((warning) => warning.path.includes("INDEX.md"))).toBe(false);
  });
});

describe("buildPrincipleIndex", () => {
  it("normalizes trigger keywords exactly like the rules subsystem", () => {
    const entry = principle({
      id: "principle-parse-boundary",
      triggers: { keywords: ["parse", "boundary", "validate"], files: [], symbols: [] },
    });
    const index = buildPrincipleIndex([entry]);
    const expected = [...new Set(entry.triggers.keywords.flatMap((keyword) => keywordKeys(keyword)))].sort();
    expect([...index.keywordIndex.keys()]).toEqual(expected);
    for (const key of expected) {
      expect(index.keywordIndex.get(key)).toEqual(["principle-parse-boundary"]);
    }
  });

  it("builds a gate index from apply_when without function words", () => {
    const entry = principle({
      id: "principle-small-batches",
      applyWhen: "Apply when the change is done.",
    });
    const index = buildPrincipleIndex([entry]);
    expect([...index.gateIndex.keys()]).toEqual(["change", "done"]);
  });

  it("indexes symbols case-insensitively and dedupes principle ids", () => {
    const entry = principle({
      id: "principle-symbols",
      triggers: { keywords: [], files: [], symbols: ["JSON.parse", "JSON.parse"] },
    });
    const index = buildPrincipleIndex([entry, entry]);
    expect(index.principles).toHaveLength(1);
    expect([...index.symbolIndex.keys()]).toEqual(["json.parse"]);
    expect(index.symbolIndex.get("json.parse")).toEqual([
      { principleId: "principle-symbols", symbol: "JSON.parse" },
    ]);
  });
});

describe("selectPrinciples", () => {
  it("selects verified principles by match score descending", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    const index = buildPrincipleIndex(principles);
    const { selected, dropped } = selectPrinciples({ prompt: "parse json boundary" }, index);
    expect(selected).toEqual([
      {
        id: "principle-parse-boundary",
        title: "Parse external input at the boundary",
        reason: "keyword 'boundary' (1x), keyword 'parse' (1x)",
      },
    ]);
    expect(dropped).toEqual([]);
  });

  it("breaks score ties by id ascending", () => {
    const index = buildPrincipleIndex([
      principle({ id: "principle-b", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
      principle({ id: "principle-a", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
    ]);
    const { selected } = selectPrinciples({ prompt: "parse" }, index);
    expect(selected.map((entry) => entry.id)).toEqual(["principle-a", "principle-b"]);
  });

  it("excludes drafts by default and includes them on request", () => {
    const index = buildPrincipleIndex([
      principle({
        id: "principle-draft",
        status: "draft",
        triggers: { keywords: ["spike"], files: [], symbols: [] },
      }),
    ]);
    expect(selectPrinciples({ prompt: "spike" }, index).selected).toEqual([]);
    const withDrafts = selectPrinciples({ prompt: "spike" }, index, { includeDrafts: true });
    expect(withDrafts.selected.map((entry) => entry.id)).toEqual(["principle-draft"]);
  });

  it("caps at the default and reports cap drops with scores", () => {
    const index = buildPrincipleIndex([
      principle({ id: "principle-a", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
      principle({ id: "principle-b", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
      principle({ id: "principle-c", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
      principle({ id: "principle-d", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
    ]);
    const { selected, dropped } = selectPrinciples({ prompt: "parse" }, index);
    expect(selected.map((entry) => entry.id)).toEqual(["principle-a", "principle-b", "principle-c"]);
    expect(dropped).toEqual([{ id: "principle-d", reason: "cap", score: 10 }]);
    expect(DEFAULT_PRINCIPLE_CAP).toBe(3);
  });

  it("honors a custom cap including zero", () => {
    const index = buildPrincipleIndex([
      principle({ id: "principle-a", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
      principle({ id: "principle-b", triggers: { keywords: ["parse"], files: [], symbols: [] } }),
    ]);
    expect(selectPrinciples({ prompt: "parse" }, index, { cap: 1 }).selected.map((entry) => entry.id)).toEqual([
      "principle-a",
    ]);
    const none = selectPrinciples({ prompt: "parse" }, index, { cap: 0 });
    expect(none.selected).toEqual([]);
    expect(none.dropped.map((entry) => entry.id)).toEqual(["principle-a", "principle-b"]);
  });

  it("scores trigger keywords above apply_when terms", () => {
    const index = buildPrincipleIndex([
      principle({
        id: "principle-gate",
        applyWhen: "Apply when data crosses a boundary.",
        triggers: { keywords: [], files: [], symbols: [] },
      }),
      principle({ id: "principle-keyword", triggers: { keywords: ["boundary"], files: [], symbols: [] } }),
    ]);
    const { selected } = selectPrinciples({ prompt: "boundary" }, index);
    expect(selected.map((entry) => entry.id)).toEqual(["principle-keyword", "principle-gate"]);
    expect(selected[0]?.reason).toBe("keyword 'boundary' (1x)");
    expect(selected[1]?.reason).toBe("apply_when 'boundary' (1x)");
  });

  it("does not match function words from apply_when", () => {
    const index = buildPrincipleIndex([
      principle({ id: "principle-a", applyWhen: "Apply when the change is done." }),
    ]);
    expect(selectPrinciples({ prompt: "when the" }, index).selected).toEqual([]);
  });

  it("matches file globs from the task file hints", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    const index = buildPrincipleIndex(principles);
    const { selected } = selectPrinciples(
      { prompt: "unrelated words here", files: ["db/001.sql"] },
      index,
    );
    expect(selected.map((entry) => entry.id)).toEqual(["principle-schema-change"]);
    expect(selected[0]?.reason).toBe("file **/*.sql (1x)");
  });

  it("counts symbol occurrences", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    const index = buildPrincipleIndex(principles);
    const { selected } = selectPrinciples({ prompt: "call JSON.parse twice, JSON.parse again" }, index);
    expect(selected.map((entry) => entry.id)).toEqual(["principle-parse-boundary"]);
    expect(selected[0]?.reason).toBe("symbol 'JSON.parse' (2x)");
  });

  it("returns nothing for an unmatched prompt", () => {
    const index = buildPrincipleIndex([principle({ id: "principle-a" })]);
    expect(selectPrinciples({ prompt: "", files: [] }, index)).toEqual({ selected: [], dropped: [] });
  });

  it("is deterministic across repeated calls and file orderings", async () => {
    const { principles } = await loadPrinciples(FIXTURE_ROOT);
    const index = buildPrincipleIndex(principles);
    const input = { prompt: "parse json boundary wire format", files: ["db/b.sql", "db/a.sql"] };
    const first = selectPrinciples(input, index);
    const second = selectPrinciples(structuredClone(input), index);
    const reordered = selectPrinciples({ ...input, files: ["db/a.sql", "db/b.sql"] }, index);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).toBe(JSON.stringify(reordered));
  });
});

describe("formatPrincipleDerivation", () => {
  it("names the principle, the match, and the apply_when gate", () => {
    const entry: PlannedPrinciple = {
      id: "principle-a",
      title: "Title A",
      reason: "keyword 'x' (1x)",
    };
    const parsed = principle({ id: "principle-a", applyWhen: "Apply when x." });
    expect(formatPrincipleDerivation(entry, parsed)).toBe(
      "principle principle-a selected: keyword 'x' (1x); Apply when x.",
    );
    expect(formatPrincipleDerivation(entry)).toBe("principle principle-a selected: keyword 'x' (1x)");
  });
});
