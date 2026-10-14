import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { formatPlanDerivation, formatRuleDerivation } from "./explain.js";
import { buildIndex, globToRegExp, matchGlob, simpleStem, termsMatch } from "./index-builder.js";
import type { RulesIndex } from "./index-builder.js";
import { loadRules } from "./loader.js";
import type { ParsedRule } from "./loader.js";
import { buildPrincipleIndex, loadPrinciples } from "./principles.js";
import type { ParsedPrinciple, PrinciplesIndex } from "./principles.js";
import { DEFAULT_BUDGET_TOKENS, inferPhase, isLanguageWideGlob, route } from "./router.js";
import { estimateRuleTokens } from "./select.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./__fixtures__/rules/", import.meta.url));
const PRINCIPLES_FIXTURE_ROOT = fileURLToPath(new URL("./__fixtures__/principles/", import.meta.url));

let index: RulesIndex;
let principlesIndex: PrinciplesIndex;

function syntheticRule(overrides: Partial<ParsedRule> & { id: string }): ParsedRule {
  return {
    lang: "typescript",
    prefix: "test",
    title: `Title ${overrides.id}`,
    severity: "must",
    enforce: "review",
    status: "verified",
    triggers: { keywords: [], files: [], symbols: [] },
    sourcesCount: 0,
    body: "",
    path: `typescript/${overrides.id}.md`,
    ...overrides,
  };
}

beforeAll(async () => {
  const { rules } = await loadRules(FIXTURE_ROOT);
  index = buildIndex(rules);
  const { principles } = await loadPrinciples(PRINCIPLES_FIXTURE_ROOT);
  principlesIndex = buildPrincipleIndex(principles);
});

describe("route language gating", () => {
  it("excludes rules whose language is not in the repo stack or prompt", () => {
    const plan = route({ prompt: "clone the repository", stack: ["typescript"] }, index);
    expect(plan.rules).toEqual([]);
  });

  it("admits a language mentioned in the task when the stack is empty", () => {
    const plan = route({ prompt: "clone and borrow in rust", stack: [] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual(["rust-own-avoid-clone"]);
    expect(plan.langs).toEqual(["rust"]);
  });

  it("uses file extensions as a language gate rather than a score source", () => {
    const gated = route({ prompt: "unrelated words here", stack: ["typescript"], files: ["src/lib.rs"] }, index);
    expect(gated.langs).toEqual(["rust", "typescript"]);
    expect(gated.rules).toEqual([]);

    const selected = route({ prompt: "clone the repository", stack: [], files: ["src/lib.rs"] }, index);
    expect(selected.langs).toEqual(["rust"]);
    expect(selected.rules.map((entry) => entry.id)).toEqual(["rust-own-avoid-clone"]);
  });

  it("is permissive when there is no language evidence", () => {
    const plan = route({ prompt: "parse json", stack: [] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual(["typescript-err-parse-boundary"]);
  });

  it("does not treat a prose 'go' as the Go language without context", () => {
    const plan = route({ prompt: "go faster on this", stack: [] }, index);
    expect(plan.langs).toEqual(["python", "rust", "typescript"]);
    expect(plan.rules).toEqual([]);
  });

  it("treats an ambiguous language token as a language when the prompt provides context", () => {
    const plan = route({ prompt: "write a go service", stack: [] }, index);
    expect(plan.langs).toEqual(["go"]);
    expect(plan.rules).toEqual([]);
  });
});

describe("route scoring and ordering", () => {
  it("selects by keyword hits without language-wide glob noise", () => {
    const plan = route(
      { prompt: "parse the JSON boundary in the handler", stack: ["typescript"], files: ["src/handler.ts"] },
      index,
    );
    expect(plan.rules).toEqual([
      {
        id: "typescript-err-parse-boundary",
        title: "Parse external input at the boundary",
        reason: "keyword 'boundary' (1x), keyword 'json' (1x), keyword 'parse' (1x)",
      },
    ]);
    expect(plan.explain).toEqual([
      {
        id: "typescript-err-parse-boundary",
        matched: ["keyword 'boundary' (1x)", "keyword 'json' (1x)", "keyword 'parse' (1x)"],
        score: 30,
      },
    ]);
  });

  it("ignores language-wide globs and scores discriminative globs below keywords", () => {
    const wide = syntheticRule({ id: "typescript-test-wide", triggers: { keywords: [], files: ["**/*.ts"], symbols: [] } });
    const globbed = syntheticRule({
      id: "typescript-z-test-glob",
      triggers: { keywords: [], files: ["**/*_test.ts"], symbols: [] },
    });
    const keyword = syntheticRule({
      id: "typescript-a-test-keyword",
      triggers: { keywords: ["cache"], files: [], symbols: [] },
    });
    const scoringIndex = buildIndex([wide, globbed, keyword]);
    const plan = route({ prompt: "cache", stack: ["typescript"], files: ["src/a_test.ts"] }, scoringIndex);
    expect(plan.rules.map((entry) => entry.id)).toEqual(["typescript-a-test-keyword", "typescript-z-test-glob"]);
    expect(plan.explain.map((entry) => entry.score)).toEqual([10, 4]);
  });

  it("breaks equal scores by keyword hit count before id", () => {
    const keywordHeavy = syntheticRule({
      id: "typescript-z-keyword-heavy",
      triggers: { keywords: ["cache"], files: [], symbols: [] },
    });
    const fileHeavy = syntheticRule({
      id: "typescript-a-file-heavy",
      triggers: { keywords: [], files: ["**/*_test.ts"], symbols: [] },
    });
    const scoringIndex = buildIndex([keywordHeavy, fileHeavy]);
    const plan = route(
      {
        prompt: "cache cache",
        stack: ["typescript"],
        files: ["a_test.ts", "b_test.ts", "c_test.ts", "d_test.ts", "e_test.ts"],
      },
      scoringIndex,
    );
    expect(plan.explain.map((entry) => entry.score)).toEqual([20, 20]);
    expect(plan.rules.map((entry) => entry.id)).toEqual(["typescript-z-keyword-heavy", "typescript-a-file-heavy"]);
  });

  it("breaks equal scores and keyword hits by symbol hit count before id", () => {
    const symbolHeavy = syntheticRule({
      id: "typescript-z-symbol-heavy",
      triggers: { keywords: ["cache"], files: [], symbols: ["Foo"] },
    });
    const fileBacked = syntheticRule({
      id: "typescript-a-file-backed",
      triggers: { keywords: ["cache"], files: ["**/*_test.ts"], symbols: [] },
    });
    const scoringIndex = buildIndex([symbolHeavy, fileBacked]);
    const plan = route(
      { prompt: "cache Foo Foo Foo Foo", stack: ["typescript"], files: ["a_test.ts"] },
      scoringIndex,
    );
    expect(plan.explain.map((entry) => entry.score)).toEqual([14, 14]);
    expect(plan.rules.map((entry) => entry.id)).toEqual(["typescript-z-symbol-heavy", "typescript-a-file-backed"]);
  });

  it("orders by severity tier before score", () => {
    const plan = route({ prompt: "any type interface parse json", stack: ["typescript"] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual([
      "typescript-err-parse-boundary",
      "typescript-type-no-any",
    ]);
  });

  it("orders by score within a severity tier", () => {
    const plan = route({ prompt: "any type interface borrow ownership", stack: ["typescript", "rust"] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual([
      "typescript-type-no-any",
      "rust-own-avoid-clone",
    ]);
  });

  it("orders should above prefer regardless of score", () => {
    const plan = route({ prompt: "borrow naming style", stack: ["rust"] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual([
      "rust-own-avoid-clone",
      "rust-style-naming",
    ]);
  });

  it("breaks score ties by id ascending", () => {
    const plan = route({ prompt: "borrow and except", stack: ["rust", "python"] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual([
      "python-err-specific-except",
      "rust-own-avoid-clone",
    ]);
  });

  it("counts symbol hits", () => {
    const plan = route({ prompt: "call JSON.parse twice and JSON.parse again", stack: ["typescript"] }, index);
    expect(plan.explain).toEqual([
      { id: "typescript-err-parse-boundary", matched: ["symbol 'JSON.parse' (2x)"], score: 2 },
    ]);
  });

  it("returns an empty plan for an unmatched prompt", () => {
    const plan = route({ prompt: "", stack: ["typescript"] }, index);
    expect(plan.rules).toEqual([]);
    expect(plan.explain).toEqual([]);
    expect(plan.budget.used).toBe(0);
  });

  it("is deterministic across repeated calls", () => {
    const input = {
      prompt: "parse json borrow clone",
      stack: ["typescript", "rust"],
      files: ["src/a.ts", "src/b.rs"],
    };
    const first = route(input, index);
    const second = route(structuredClone(input), index);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("route draft handling", () => {
  it("excludes drafts from auto-selection", () => {
    const plan = route({ prompt: "async await race parse json", stack: ["typescript"] }, index);
    expect(plan.rules.map((rule) => rule.id)).toEqual(["typescript-err-parse-boundary"]);
  });

  it("includes drafts only when explicitly requested", () => {
    const plan = route({ prompt: "async await race parse json", stack: ["typescript"] }, index, {
      includeDrafts: true,
    });
    expect(plan.rules.map((rule) => rule.id)).toEqual([
      "typescript-async-race-draft",
      "typescript-err-parse-boundary",
    ]);
  });
});

describe("route budget packing", () => {
  it("drops an oversized rule and continues with smaller ones", () => {
    const plan = route({ prompt: "huge perf hotloop parse json", stack: ["typescript"] }, index, { budgetTokens: 300 });
    const hugeTokens = estimateRuleTokens(index.byId.get("typescript-perf-huge-rule")!);
    const parseTokens = estimateRuleTokens(index.byId.get("typescript-err-parse-boundary")!);
    expect(hugeTokens).toBeGreaterThan(300);
    expect(plan.rules.map((rule) => rule.id)).toEqual(["typescript-err-parse-boundary"]);
    expect(plan.budget.allocated).toBe(300);
    expect(plan.budget.used).toBe(parseTokens);
    expect(plan.budget.dropped).toEqual([
      { id: "typescript-perf-huge-rule", reason: "oversized", tokens: hugeTokens },
    ]);
  });

  it("records budget drops without breaking ordering", () => {
    const parseRule = index.byId.get("typescript-err-parse-boundary")!;
    const typeRule = index.byId.get("typescript-type-no-any")!;
    const parseTokens = estimateRuleTokens(parseRule);
    const typeTokens = estimateRuleTokens(typeRule);
    const budgetTokens = parseTokens + typeTokens - 1;
    const plan = route({ prompt: "parse json any type interface", stack: ["typescript"] }, index, { budgetTokens });
    expect(plan.rules.map((rule) => rule.id)).toEqual(["typescript-err-parse-boundary"]);
    expect(plan.budget.used).toBe(parseTokens);
    expect(plan.budget.dropped).toEqual([
      { id: "typescript-type-no-any", reason: "budget", tokens: typeTokens },
    ]);
  });

  it("uses the default budget when none is provided", () => {
    const plan = route({ prompt: "parse json", stack: ["typescript"] }, index);
    expect(plan.budget.allocated).toBe(DEFAULT_BUDGET_TOKENS);
    expect(plan.budget.dropped).toEqual([]);
  });
});

describe("route plan shape and explain", () => {
  it("infers phase and honors an explicit phase", () => {
    expect(route({ prompt: "implement the parser", stack: ["typescript"] }, index).phase).toBe("implement");
    expect(route({ prompt: "implement the parser", stack: ["typescript"], phase: "review" }, index).phase).toBe("review");
  });

  it("uses phase only as plan metadata, not as a rule eligibility claim", () => {
    const input = { prompt: "parse json", stack: ["typescript"] };
    const explore = route({ ...input, phase: "explore" }, index);
    const ship = route({ ...input, phase: "ship" }, index);
    expect(ship.rules).toEqual(explore.rules);
    expect(ship.explain).toEqual(explore.explain);
  });

  it("returns the plan shape with empty flows and gates", () => {
    const plan = route({ prompt: "parse json", stack: ["typescript"] }, index);
    expect(plan.flows).toEqual([]);
    expect(plan.gates).toEqual([]);
    expect(plan.langs).toEqual(["typescript"]);
    expect(plan.principles).toEqual([]);
  });

  it("formats a human-readable derivation", () => {
    const plan = route({ prompt: "parse json", stack: ["typescript"] }, index);
    const entry = plan.explain[0]!;
    const rule = index.byId.get(entry.id)!;
    expect(formatRuleDerivation(entry, rule)).toBe(
      "rule typescript-err-parse-boundary selected: keyword 'json' (1x), keyword 'parse' (1x), severity must",
    );
    const text = formatPlanDerivation(plan, index.byId);
    expect(text).toContain("rule typescript-err-parse-boundary selected:");
    expect(text).toContain(`budget: ${plan.budget.used}/${plan.budget.allocated} tokens`);
  });
});

describe("route principle selection", () => {
  it("populates principles from the injected index with the same task input", () => {
    const plan = route(
      { prompt: "parse json boundary", stack: ["typescript"], files: ["db/001.sql"] },
      index,
      { principlesIndex },
    );
    expect(plan.principles.map((entry) => entry.id)).toEqual([
      "principle-schema-change",
      "principle-parse-boundary",
    ]);
    expect(plan.principles[0]?.reason).toBe("file **/*.sql (1x)");
  });

  it("passes the cap to principle selection", () => {
    const principles: ParsedPrinciple[] = ["a", "b", "c", "d"].map((suffix) => ({
      id: `principle-${suffix}`,
      title: `Title ${suffix}`,
      applyWhen: "Apply when parsing.",
      enforce: "review",
      status: "verified",
      triggers: { keywords: ["parse"], files: [], symbols: [] },
      related: [],
      sourcesCount: 0,
      body: "",
      path: `${suffix}.md`,
    }));
    const plan = route({ prompt: "parse", stack: [] }, index, {
      principlesIndex: buildPrincipleIndex(principles),
      principlesCap: 2,
    });
    expect(plan.principles.map((entry) => entry.id)).toEqual(["principle-a", "principle-b"]);
  });

  it("is deterministic across repeated calls", () => {
    const input = { prompt: "parse json boundary", stack: ["typescript"] };
    const options = { principlesIndex };
    const first = route(structuredClone(input), index, options);
    const second = route(structuredClone(input), index, options);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe("matchGlob", () => {
  it("normalizes and bounds the compiled-glob cache while retaining recent entries", () => {
    const first = globToRegExp("__cache_test__/0/*.ts");
    expect(globToRegExp("./__cache_test__/0/*.ts")).toBe(first);
    const oldest = globToRegExp("__cache_test__/1/*.ts");
    for (let i = 2; i < 512; i += 1) globToRegExp(`__cache_test__/${i}/*.ts`);
    expect(globToRegExp("__cache_test__/0/*.ts")).toBe(first);
    globToRegExp("__cache_test__/512/*.ts");
    expect(globToRegExp("__cache_test__/1/*.ts")).not.toBe(oldest);
    for (let i = 513; i < 1100; i += 1) globToRegExp(`__cache_test__/${i}/*.ts`);
    const renewed = globToRegExp("__cache_test__/0/*.ts");
    expect(renewed).not.toBe(first);
    expect(renewed.test("__cache_test__/0/a.ts")).toBe(true);
  });

  it("supports ** across directories", () => {
    expect(matchGlob("**/*.ts", "a.ts")).toBe(true);
    expect(matchGlob("**/*.ts", "src/deep/a.ts")).toBe(true);
    expect(matchGlob("**/*.ts", "a.tsx")).toBe(false);
    expect(matchGlob("a/**/b.ts", "a/b.ts")).toBe(true);
    expect(matchGlob("a/**/b.ts", "a/x/y/b.ts")).toBe(true);
  });

  it("supports single-segment * and ?", () => {
    expect(matchGlob("src/*.ts", "src/a.ts")).toBe(true);
    expect(matchGlob("src/*.ts", "src/deep/a.ts")).toBe(false);
    expect(matchGlob("src/?.ts", "src/a.ts")).toBe(true);
    expect(matchGlob("src/?.ts", "src/ab.ts")).toBe(false);
  });
});

describe("isLanguageWideGlob", () => {
  it("detects language-wide globs for the rule's own language only", () => {
    expect(isLanguageWideGlob("**/*.ts", "typescript")).toBe(true);
    expect(isLanguageWideGlob("**/*.tsx", "typescript")).toBe(true);
    expect(isLanguageWideGlob("**/*.go", "go")).toBe(true);
    expect(isLanguageWideGlob("**/*.ts", "rust")).toBe(false);
    expect(isLanguageWideGlob("**/*_test.go", "go")).toBe(false);
    expect(isLanguageWideGlob("**/go.mod", "go")).toBe(false);
    expect(isLanguageWideGlob("src/*.ts", "typescript")).toBe(false);
  });
});

describe("termsMatch", () => {
  const match = (a: string, b: string): boolean => termsMatch(simpleStem(a), simpleStem(b));

  it("matches equal stems", () => {
    expect(match("cache", "cache")).toBe(true);
  });

  it("matches stems that differ only by a restored trailing e", () => {
    expect(match("cache", "caching")).toBe(true);
    expect(match("caches", "cache")).toBe(true);
    expect(match("parsing", "parse")).toBe(true);
    expect(match("validating", "validate")).toBe(true);
    expect(match("explode", "exploding")).toBe(true);
  });

  it("does not match unrelated stems", () => {
    expect(match("cache", "cactus")).toBe(false);
    expect(match("parse", "parser")).toBe(false);
    expect(match("explode", "explosion")).toBe(false);
  });
});

describe("inferPhase", () => {
  it("routes common task verbs to their phase", () => {
    expect(inferPhase("fix the retry bug")).toBe("implement");
    expect(inferPhase("debug a deadlock in the worker")).toBe("implement");
    expect(inferPhase("add tests for the parser")).toBe("implement");
    expect(inferPhase("optimize the hot loop")).toBe("implement");
    expect(inferPhase("migrate the client to the new API")).toBe("implement");
    expect(inferPhase("verify the migration output")).toBe("review");
    expect(inferPhase("review the diff")).toBe("review");
    expect(inferPhase("analyze the logs")).toBe("explore");
    expect(inferPhase("release v2")).toBe("ship");
  });

  it("matches inflected forms", () => {
    expect(inferPhase("fixing the flaky test")).toBe("implement");
    expect(inferPhase("shipping the integration")).toBe("ship");
    expect(inferPhase("debugging a hang")).toBe("implement");
    expect(inferPhase("refactoring the loader")).toBe("review");
  });

  it("does not match keywords inside unrelated words", () => {
    expect(inferPhase("stage the fixture")).toBe("explore");
    expect(inferPhase("the latest gossip")).toBe("explore");
    expect(inferPhase("address the leftover comment")).toBe("explore");
  });

  it("falls back to explore", () => {
    expect(inferPhase("")).toBe("explore");
    expect(inferPhase("think about the problem")).toBe("explore");
  });

  it("picks the phase of the earliest matched keyword, not the first matching group", () => {
    expect(inferPhase("add a null check to the parser")).toBe("implement");
    expect(inferPhase("plan the refactor")).toBe("explore");
  });
});


describe("catalog relevance", () => {
  let catalogIndex: RulesIndex;
  beforeAll(async () => { catalogIndex = buildIndex((await loadRules()).rules); });

  it("does not load code rules from ordinary function words", () => {
    expect(route({ prompt: "this is for the project and we can do it. Look at this.", stack: ["typescript"] }, catalogIndex).rules).toEqual([]);
  });

  it("requires complete phrase evidence", () => {
    const ids = (prompt: string) => route({ prompt, stack: ["typescript"] }, catalogIndex, { budgetTokens: 50000 }).rules.map(r => r.id);
    expect(ids("review fire safety and forget obsolete notes")).not.toContain("typescript-async-no-void-silence");
    expect(ids("handle fire and forget promises")).toContain("typescript-async-no-void-silence");
    expect(ids("use for await with async iterables")).toContain("typescript-async-async-iteration");
  });

  it("retains explicit code symbols and technical phrases", () => {
    const ids = (prompt: string) => route({ prompt, stack: ["typescript"] }, catalogIndex, { budgetTokens: 50000 }).rules.map(r => r.id);
    expect(ids("review `this` usage")).toContain("typescript-api-this-return-type");
    expect(ids("review this type in fluent APIs")).toContain("typescript-api-this-return-type");
    expect(ids("review this.value access")).toContain("typescript-api-this-return-type");
  });

  it("selects cache rules by keyword instead of letting language-wide globs flood the plan", () => {
    const plan = route(
      { prompt: "fix caching bug in cache layer", stack: ["typescript"], files: ["src/cache.ts"] },
      catalogIndex,
    );
    expect(plan.rules.map((entry) => entry.id)).toContain("typescript-mem-bounded-cache");
    expect(plan.explain.map((entry) => entry.id).filter((id) => id.includes("-anti-"))).toEqual([]);
  });

  it("does not select rules from language-wide globs alone", () => {
    const plan = route(
      { prompt: "unrelated words here", stack: ["typescript"], files: ["src/cache.ts"] },
      catalogIndex,
    );
    expect(plan.rules).toEqual([]);
  });
});
