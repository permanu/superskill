import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stateFromPlan, type CampaignPlan } from "./queue.js";
import { buildReport, generateStatus, renderStatus, scanCatalogRules } from "./status.js";

const FIXED = "2026-10-04T12:00:00.000Z";

function fixturePlan(): CampaignPlan {
  return {
    version: 1,
    generated: "2026-10-04",
    contract: "docs/authoring/CONTRACT.md",
    targetTotal: 30,
    languages: [
      { lang: "rust", baseline: "latest", target: 20, batches: 2 },
      { lang: "python", baseline: "latest", target: 10, batches: 1 },
    ],
    batches: [
      { id: "rust/own", lang: "rust", prefix: "own", title: "Ownership", target: 12, status: "pending", updated: null },
      { id: "rust/err", lang: "rust", prefix: "err", title: "Error handling", target: 8, status: "pending", updated: null },
      { id: "python/py", lang: "python", prefix: "py", title: "Pythonic idioms", target: 10, status: "pending", updated: null },
    ],
    nonContent: [
      { id: "harness/ci", title: "Harness CI", description: "CI jobs", status: "pending", updated: null },
    ],
  };
}

function ruleMarkdown(lang: string, prefix: string, status?: string): string {
  const lines = [
    "---",
    `id: ${lang}-${prefix}-sample`,
    `lang: ${lang}`,
    `prefix: ${prefix}`,
    "title: A sample rule",
    "severity: should",
    "enforce: review",
    `baseline: sample baseline`,
    ...(status ? [`status: ${status}`] : []),
    "sources:",
    "  - title: Source",
    "    url: https://example.com/",
    "---",
    "> Summary.",
    "",
  ];
  return lines.join("\n");
}

interface Fixture {
  root: string;
  workstreamsDir: string;
  catalogRulesDir: string;
  plan: CampaignPlan;
}

describe("campaign status", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    const root = await mkdtemp(join(tmpdir(), "rules-status-"));
    const workstreamsDir = join(root, "workstreams");
    const catalogRulesDir = join(root, "catalog/rules");
    await mkdir(workstreamsDir, { recursive: true });
    await mkdir(join(catalogRulesDir, "rust"), { recursive: true });
    await mkdir(join(catalogRulesDir, "python"), { recursive: true });

    const plan = fixturePlan();
    await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(plan, null, 2));

    await writeFile(join(catalogRulesDir, "rust/own-parse.md"), ruleMarkdown("rust", "own", "draft"));
    await writeFile(join(catalogRulesDir, "rust/err-wrap.md"), ruleMarkdown("rust", "err", "verified"));
    await writeFile(join(catalogRulesDir, "rust/INDEX.md"), "# Index\n");
    await writeFile(join(catalogRulesDir, "rust/sources.md"), "# Sources\n");
    await writeFile(join(catalogRulesDir, "rust/categories.md"), "# Categories\n");

    const state = stateFromPlan(plan, new Date(FIXED));
    state.batches["rust/own"] = { status: "claimed", owner: "agent-1", updated: FIXED, claimed_at: FIXED, completed_at: null, note: null };
    state.batches["rust/err"] = { status: "done", owner: "agent-1", updated: FIXED, claimed_at: FIXED, completed_at: FIXED, note: null };
    await writeFile(join(workstreamsDir, "state.json"), JSON.stringify(state, null, 2));

    fixture = { root, workstreamsDir, catalogRulesDir, plan };
  });

  afterEach(async () => {
    await rm(fixture.root, { recursive: true, force: true });
  });

  it("scans rule files and skips INDEX/sources/categories", async () => {
    const rules = await scanCatalogRules(fixture.catalogRulesDir, ["rust", "python"]);
    expect(rules.map((r) => r.file)).toEqual(["err-wrap.md", "own-parse.md"]);
    expect(rules.find((r) => r.file === "own-parse.md")?.status).toBe("draft");
    expect(rules.find((r) => r.file === "err-wrap.md")?.status).toBe("verified");
    expect(rules.every((r) => r.lang === "rust")).toBe(true);
  });

  it("builds accurate per-language and total counts", async () => {
    const { report } = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
    });
    expect(report.onDiskTotal).toBe(2);
    expect(report.verifiedTotal).toBe(1);
    expect(report.draftTotal).toBe(1);
    expect(report.otherTotal).toBe(0);
    expect(report.targetTotal).toBe(30);
    expect(report.languageCount).toBe(2);
    expect(report.percentOnDisk).toBeCloseTo((2 / 30) * 100, 5);
    expect(report.batchTotals).toEqual({ pending: 1, claimed: 1, done: 1, failed: 0, blocked: 0, superseded: 0 });

    const rust = report.languages.find((l) => l.lang === "rust");
    expect(rust).toMatchObject({ target: 20, onDisk: 2, verified: 1, draft: 1, other: 0, batchTotal: 2 });
    expect(rust?.batches).toEqual({ pending: 0, claimed: 1, done: 1, failed: 0, blocked: 0, superseded: 0 });

    const python = report.languages.find((l) => l.lang === "python");
    expect(python).toMatchObject({ target: 10, onDisk: 0, verified: 0, draft: 0, other: 0, batchTotal: 1 });

    expect(report.nextPending.map((e) => e.id)).toEqual(["python/py"]);
  });

  it("renders totals, per-language tables, next pending and workstreams", async () => {
    const { markdown } = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
    });
    expect(markdown).toContain("# Atomic Rules Campaign — STATUS");
    expect(markdown).toContain(`Generated: ${FIXED}`);
    expect(markdown).toContain("- Target rules: **30** across 2 languages");
    expect(markdown).toContain("- On disk: **2** (6.7%)");
    expect(markdown).toContain("| rust | latest | 20 | 2 | 1 | 1 | 0 | 0/1/1/0/0/0 |");
    expect(markdown).toContain("| python | latest | 10 | 0 | 0 | 0 | 0 | 1/0/0/0/0/0 |");
    expect(markdown).toContain("- `python/py` — Pythonic idioms (target 10)");
    expect(markdown).toContain("| `harness/ci` | Harness CI | pending | — |");
    expect(markdown.endsWith("\n")).toBe(true);
  });

  it("honours nextLimit and reports the remainder", async () => {
    const { report, markdown } = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
      nextLimit: 0,
    });
    expect(report.nextPending).toHaveLength(0);
    expect(markdown).toContain("- … and 1 more pending");
  });

  it("writes STATUS.md to the requested path", async () => {
    const statusPath = join(fixture.workstreamsDir, "STATUS.md");
    const result = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
    });
    expect(result.statusPath).toBe(statusPath);
    expect(await readFile(statusPath, "utf-8")).toBe(result.markdown);
  });

  it("renders identically for identical inputs", async () => {
    const opts = {
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
    };
    const first = await generateStatus(opts);
    const second = await generateStatus(opts);
    expect(second.markdown).toBe(first.markdown);
  });

  it("degrades gracefully without state.json and does not create it", async () => {
    const root = await mkdtemp(join(tmpdir(), "rules-status-nostate-"));
    try {
      const workstreamsDir = join(root, "workstreams");
      await mkdir(workstreamsDir, { recursive: true });
      await writeFile(join(workstreamsDir, "plan.json"), JSON.stringify(fixturePlan(), null, 2));

      const { report } = await generateStatus({
        workstreamsDir,
        catalogRulesDir: fixture.catalogRulesDir,
        generatedAt: FIXED,
      });
      expect(report.batchTotals).toEqual({ pending: 3, claimed: 0, done: 0, failed: 0, blocked: 0, superseded: 0 });
      await expect(stat(join(workstreamsDir, "state.json"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("tolerates missing catalog directories", async () => {
    const missing = join(fixture.root, "does-not-exist");
    const { report, markdown } = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: missing,
      generatedAt: FIXED,
    });
    expect(report.onDiskTotal).toBe(0);
    expect(report.languages.every((l) => l.onDisk === 0)).toBe(true);
    expect(markdown).toContain("On disk: **0** (0.0%)");
  });

  it("counts rules with missing or unknown status as other", async () => {
    await writeFile(join(fixture.catalogRulesDir, "python/py-idiom.md"), ruleMarkdown("python", "py"));
    const rules = await scanCatalogRules(fixture.catalogRulesDir, ["python"]);
    expect(rules).toHaveLength(1);
    expect(rules[0].status).toBe("unknown");

    const { report } = await generateStatus({
      workstreamsDir: fixture.workstreamsDir,
      catalogRulesDir: fixture.catalogRulesDir,
      generatedAt: FIXED,
    });
    const python = report.languages.find((l) => l.lang === "python");
    expect(python?.other).toBe(1);
    expect(report.otherTotal).toBe(1);
  });

  it("buildReport and renderStatus work as pure helpers", () => {
    const plan = fixturePlan();
    const report = buildReport(plan, stateFromPlan(plan), [], FIXED, 20);
    expect(report.onDiskTotal).toBe(0);
    expect(report.batchTotals.pending).toBe(3);
    const markdown = renderStatus(report);
    expect(markdown).not.toContain("All batches are claimed or complete.");
    expect(markdown).toContain("`rust/own` — Ownership (target 12)");
  });
});
