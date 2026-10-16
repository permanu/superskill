// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RULE_LANGUAGES } from "./types.js";
import { loadRules, type ParsedRule } from "./loader.js";
import { buildIndex, type RulesIndex } from "./index-builder.js";
import { route } from "./router.js";
import { validateFile } from "./validate.js";
import { loadRuleContent } from "./content.js";

let catalog: RulesIndex;
beforeAll(async () => { catalog = buildIndex((await loadRules()).rules); });

function rule(id: string, lang: string, related: string[] = [], status: "draft" | "verified" = "verified"): ParsedRule {
  return { id, lang, prefix: "sec", title: id, severity: "must", enforce: "review", status, related, triggers: { keywords: [lang === "shared" ? "isolation" : "adapter-check"], files: [], symbols: [] }, sourcesCount: 1, body: "A bounded shared control.", path: `${lang}/${id}.md` };
}

describe("shared atomic routing across all supported languages", () => {
  it.each(RULE_LANGUAGES)("loads one shared control for %s without foreign-language adapters", lang => {
    const plan = route({ prompt: "validate ledger postings", stack: [lang] }, catalog, { budgetTokens: 6000 });
    expect(plan.rules.some(entry => entry.id === "shared-data-balanced-postings")).toBe(true);
    expect(plan.rules.every(entry => ["shared", lang].includes(catalog.byId.get(entry.id)!.lang))).toBe(true);
    expect(plan.langs).toEqual([lang]);
  });

  it.each(RULE_LANGUAGES)("follows a %s adapter reference exactly once without recursively expanding the catalog", lang => {
    const shared = rule("shared-sec-isolation", "shared", ["shared-sec-unrelated"]);
    const index = buildIndex([shared, rule("shared-sec-unrelated", "shared"), rule(`${lang}-sec-first`, lang, [shared.id]), rule(`${lang}-sec-second`, lang, [shared.id])]);
    const plan = route({ prompt: "adapter-check", stack: [lang] }, index);
    expect(plan.rules.filter(entry => entry.id === shared.id)).toHaveLength(1);
    expect(plan.rules.some(entry => entry.id === "shared-sec-unrelated")).toBe(false);
    expect(plan.explain.find(entry => entry.id === shared.id)?.matched.join(" ")).toContain("shared control referenced by");
  });

  it.each(RULE_LANGUAGES)("keeps shared controls lazy for unrelated %s work", lang => {
    const plan = route({ prompt: "rename the button color", stack: [lang] }, catalog);
    expect(plan.rules.some(entry => entry.id.startsWith("shared-"))).toBe(false);
  });

  it("respects draft status and budgets for shared references", () => {
    const shared = rule("shared-sec-isolation", "shared", [], "draft");
    const adapter = rule("go-sec-adapter", "go", [shared.id]);
    const index = buildIndex([shared, adapter]);
    expect(route({ prompt: "adapter-check isolation", stack: ["go"] }, index).rules.map(entry => entry.id)).toEqual([adapter.id]);
    const small = route({ prompt: "adapter-check isolation", stack: ["go"] }, index, { budgetTokens: 1, includeDrafts: true });
    expect(small.rules).toEqual([]);
    expect(small.budget.used).toBeLessThanOrEqual(1);
  });

  it("provides real shared references from every language and opens a control directly", async () => {
    for (const lang of RULE_LANGUAGES) expect(catalog.rules.some(entry => entry.lang === lang && entry.related?.some(id => id.startsWith("shared-")))).toBe(true);
    const content = await loadRuleContent(["shared-sec-project-scope"]);
    expect(content.size).toBe(1);
    expect(content.get("shared-sec-project-scope")?.body).toContain("## Good");
  });
});

describe("shared control authoring contract", () => {
  const roots: string[] = [];
  afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

  async function validate(extra = "", tag = "text", body = "Scope alpha cannot read beta.") {
    const root = await mkdtemp(join(tmpdir(), "shared-rules-"));
    roots.push(root);
    await mkdir(join(root, "shared"));
    const path = join(root, "shared", "sec-scope.md");
    await writeFile(path, `---\nid: shared-sec-scope\nlang: shared\nprefix: sec\ntitle: Enforce project scope\nseverity: must\nenforce: review\nbaseline: latest\nstatus: draft\ntriggers:\n  keywords: [isolation]\nsources:\n  - title: Authorization\n    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html\n${extra}---\n> Enforce project scope.\n\n## Why\n\nA global lookup leaks another project's data.\n\n## Bad\n\n\`\`\`${tag}\n${body}\n\`\`\`\n\n## Good\n\n\`\`\`${tag}\nReject unresolved scope before lookup.\n\`\`\`\n`);
    return validateFile(path, { compile: true, knownIds: new Set() });
  }

  it("validates concrete text scenarios without pretending to compile them", async () => {
    const result = await validate();
    expect(result.issues).toEqual([]);
    expect(result.rule?.lang).toBe("shared");
    expect(result.compile).toEqual([]);
  });
  it.each(["tool: fake-compiler\n", "compile_exempt: bypass\n"])("rejects false enforcement claims", async extra => {
    expect((await validate(extra)).issues.some(issue => issue.code === "shared-review-only")).toBe(true);
  });
  it("rejects language-specific code and empty shared scenarios", async () => {
    expect((await validate("", "typescript")).issues.some(issue => issue.code === "fence-language")).toBe(true);
    expect((await validate("", "text", "")).issues.some(issue => issue.code === "snippet-empty")).toBe(true);
  });
});
