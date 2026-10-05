// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RuleLanguage, ValidationIssue } from "./types.js";
import {
  validateAll,
  validateFile,
  validatePack,
  type FileValidationResult,
  type ValidateOptions,
} from "./validate.js";

const FIXTURES = fileURLToPath(new URL("./__fixtures__/contract/", import.meta.url));
const KNOWN_OK = new Set(["rust-err-result", "rust-api-result-context"]);

function codes(issues: ValidationIssue[]): string[] {
  return issues.map((entry) => entry.code);
}

function inlineRuleContent(
  lang: RuleLanguage,
  stem: string,
  bad: string,
  good: string,
  extraFrontmatter: string[] = [],
  why = "The validator must accept language syntax and reject elisions.",
): string {
  const fence = "```";
  return [
    "---",
    `id: ${lang}-${stem}`,
    `lang: ${lang}`,
    "prefix: err",
    "title: An inline fixture rule for validator tests",
    "severity: must",
    "enforce: review",
    "baseline: latest",
    "status: draft",
    ...extraFrontmatter,
    "sources:",
    "  - title: Example source",
    "    url: https://example.com/spec",
    "---",
    "",
    "> Use the rule under test.",
    "",
    "## Why",
    "",
    why,
    "",
    "## Bad",
    "",
    `${fence}${lang}`,
    bad,
    fence,
    "",
    "## Good",
    "",
    `${fence}${lang}`,
    good,
    fence,
    "",
  ].join("\n");
}

async function validateInline(
  lang: RuleLanguage,
  fileName: string,
  bad: string,
  good: string,
  why?: string,
): Promise<ValidationIssue[]> {
  const stem = fileName.replace(/\.md$/, "");
  const dir = await mkdtemp(join(tmpdir(), `rules-inline-${lang}-`));
  const packDir = join(dir, lang);
  await mkdir(packDir, { recursive: true });
  const file = join(packDir, fileName);
  await writeFile(file, inlineRuleContent(lang, stem, bad, good, [], why), "utf-8");
  try {
    const result = await validateFile(file, { compile: false, knownIds: new Set() });
    return result.issues;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("validateFile", () => {
  it("accepts a contract-valid rule and exposes the parsed rule", async () => {
    const result = await validateFile(join(FIXTURES, "ok/rust/err-result.md"), {
      compile: false,
      knownIds: KNOWN_OK,
    });
    expect(result.issues).toEqual([]);
    expect(result.rule).not.toBeNull();
    expect(result.rule?.id).toBe("rust-err-result");
    expect(result.rule?.relPath).toBe("rust/err-result.md");
    expect(result.rule?.summary).toBe("Return Result from fallible functions instead of panicking.");
    expect(result.rule?.sources).toHaveLength(1);
    expect(result.compile).toEqual([]);
  });

  it("rejects an id that does not match lang + file stem", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-bad-id.md"), { compile: false });
    expect(codes(result.issues)).toContain("id-mismatch");
  });

  it("rejects a prefix that does not match the file stem", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-prefix-mismatch.md"), { compile: false });
    expect(codes(result.issues)).toContain("prefix-mismatch");
  });

  it("rejects missing sources", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-missing-source.md"), { compile: false });
    expect(codes(result.issues)).toContain("source-missing");
  });

  it("rejects malformed YAML frontmatter", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-broken-yaml.md"), { compile: false });
    expect(codes(result.issues)).toContain("fm-parse");
    expect(result.rule).toBeNull();
  });

  it("rejects a file without frontmatter", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-nofm-"));
    const file = join(dir, "rust-err-no-frontmatter.md");
    await writeFile(file, "# no frontmatter here\n", "utf-8");
    try {
      const result = await validateFile(file, { compile: false });
      expect(codes(result.issues)).toContain("fm-missing");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an invalid source URL", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-bad-url.md"), { compile: false });
    expect(codes(result.issues)).toContain("source-url");
  });

  it("rejects a section order other than Why, Bad, Good, See Also", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-wrong-order.md"), { compile: false });
    expect(codes(result.issues)).toContain("section-order");
  });

  it("rejects more than one fenced block per section", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-duplicate-fences.md"), { compile: false });
    expect(codes(result.issues)).toContain("fence-count");
  });

  it("rejects a fence tagged for a different language", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-bad-fence-lang.md"), { compile: false });
    expect(codes(result.issues)).toContain("fence-language");
  });

  it("rejects a missing required section", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-missing-good.md"), { compile: false });
    expect(codes(result.issues)).toContain("section-missing");
  });

  it("rejects duplicate sections", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-dup-section.md"), { compile: false });
    expect(codes(result.issues)).toContain("section-duplicate");
  });

  it("rejects unexpected sections", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-unknown-section.md"), { compile: false });
    expect(codes(result.issues)).toContain("section-unknown");
  });

  it("rejects forbidden tokens", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-forbidden-token.md"), { compile: false });
    const tokens = result.issues.filter((entry) => entry.code === "forbidden-token");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].severity).toBe("error");
  });

  it("warns on placeholder and lorem instead of failing", async () => {
    const issues = await validateInline(
      "rust",
      "err-slop-words.md",
      "fn bad() {}",
      "fn good() {}",
      "Use this as a placeholder lorem value.",
    );
    const tokens = issues.filter((entry) => entry.code === "forbidden-token");
    expect(tokens).toHaveLength(2);
    expect(tokens.every((entry) => entry.severity === "warning")).toBe(true);
    expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
  });

  it("warns on elisions inside code comments", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-elision.md"), { compile: false });
    const elisions = result.issues.filter((entry) => entry.code === "comment-elision");
    expect(elisions).toHaveLength(1);
    expect(elisions[0].severity).toBe("warning");
    expect(result.issues.filter((entry) => entry.severity === "error")).toEqual([]);
  });

  it("rejects unresolved related ids", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-unresolved-related.md"), { compile: false });
    expect(codes(result.issues)).toContain("related-unresolved");
  });

  it("rejects malformed external related entries", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-external-related.md"), { compile: false });
    expect(codes(result.issues)).toContain("related-external");
  });

  it("rejects invalid enum values", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-bad-enum.md"), { compile: false });
    expect(codes(result.issues)).toContain("enum");
  });

  it("requires a tool id when enforce is tool", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-missing-tool.md"), { compile: false });
    expect(codes(result.issues)).toContain("tool-required");
  });

  it("rejects a summary longer than 30 words", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-long-summary.md"), { compile: false });
    expect(codes(result.issues)).toContain("summary-too-long");
  });

  it("rejects a body without a summary line", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-no-summary.md"), { compile: false });
    expect(codes(result.issues)).toContain("summary-missing");
  });

  it("warns instead of failing when related ids cannot be resolved", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-unchecked-"));
    const file = join(dir, "rust-err-unchecked.md");
    const content = inlineRuleContent("rust", "err-unchecked", "fn bad() {}", "fn good() {}", [
      "related: [rust-some-other-rule]",
    ]);
    await writeFile(file, content, "utf-8");
    try {
      const result = await validateFile(file, { compile: false });
      const relatedWarnings = result.issues.filter((entry) => entry.code === "related-unchecked");
      expect(relatedWarnings).toHaveLength(1);
      expect(relatedWarnings[0].severity).toBe("warning");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("elision detection", () => {
  it("accepts C++ catch-all syntax with ...", async () => {
    const issues = await validateInline(
      "cpp",
      "err-catch-all.md",
      "void f() { try { g(); } catch (...) { } }",
      "void f() { try { g(); } catch (const std::exception& e) { (void)e; } }",
    );
    expect(codes(issues)).not.toContain("snippet-elision");
  });

  it("accepts Python Ellipsis statements", async () => {
    const issues = await validateInline(
      "python",
      "err-stub.md",
      "def f() -> int:\n    ...",
      "def f() -> int:\n    return 1",
    );
    expect(codes(issues)).not.toContain("snippet-elision");
  });

  it("accepts Rust range syntax using ..", async () => {
    const issues = await validateInline(
      "rust",
      "err-range.md",
      "fn f() -> std::ops::Range<u8> { 0..10 }",
      "fn f() -> std::ops::RangeInclusive<u8> { 0..=10 }",
    );
    expect(codes(issues)).not.toContain("snippet-elision");
  });

  it("accepts range notation inside comments", async () => {
    const issues = await validateInline(
      "rust",
      "err-range-comment.md",
      "fn f() {\n    // 0..10 is the valid range\n}",
      "fn f() {}",
    );
    expect(codes(issues)).not.toContain("snippet-elision");
  });

  it("rejects a bare ... line", async () => {
    const issues = await validateInline("rust", "err-lone.md", "fn f() {\n    ...\n}", "fn f() {}");
    const elisions = issues.filter((entry) => entry.code === "snippet-elision");
    expect(elisions).toHaveLength(1);
    expect(elisions[0].severity).toBe("error");
  });

  it("rejects a bare .. line", async () => {
    const issues = await validateInline("rust", "err-lone-dotdot.md", "fn f() {\n    ..\n}", "fn f() {}");
    const elisions = issues.filter((entry) => entry.code === "snippet-elision");
    expect(elisions).toHaveLength(1);
    expect(elisions[0].severity).toBe("error");
  });

  it("warns on unicode ellipses", async () => {
    const issues = await validateInline("rust", "err-unicode.md", "fn f() {}\u2026", "fn f() {}");
    const ellipses = issues.filter((entry) => entry.code === "unicode-ellipsis");
    expect(ellipses).toHaveLength(1);
    expect(ellipses[0].severity).toBe("warning");
  });

  it("warns on elisions inside line comments", async () => {
    const issues = await validateInline(
      "rust",
      "err-comment.md",
      "fn f() {\n    // read the rest ...\n}",
      "fn f() {}",
    );
    const elisions = issues.filter((entry) => entry.code === "comment-elision");
    expect(elisions).toHaveLength(1);
    expect(elisions[0].severity).toBe("warning");
  });

  it("treats C preprocessor lines as code, not comments", async () => {
    const issues = await validateInline(
      "c",
      "macro-variadic.md",
      "#define LOG(fmt, ...) fprintf(stderr, fmt, __VA_ARGS__)",
      "void log_all(const char *fmt, ...) { (void)fmt; }",
    );
    expect(issues.filter((entry) => entry.code === "comment-elision")).toEqual([]);
  });

  it("still warns on elisions inside Python hash comments", async () => {
    const issues = await validateInline(
      "python",
      "err-comment.md",
      "# parse the payload ...\nvalue = 1",
      "value = 1",
    );
    const elisions = issues.filter((entry) => entry.code === "comment-elision");
    expect(elisions).toHaveLength(1);
    expect(elisions[0].severity).toBe("warning");
  });
});

describe("hedging detection", () => {
  it("warns on hedging phrases in prose", async () => {
    const issues = await validateInline(
      "rust",
      "err-hedge.md",
      "fn bad() {}",
      "fn good() {}",
      "You might consider this often.",
    );
    const hedges = issues.filter((entry) => entry.code === "hedging");
    expect(hedges.length).toBeGreaterThan(0);
    expect(hedges.every((entry) => entry.severity === "warning")).toBe(true);
  });

  it("warns on 'as needed' without a condition", async () => {
    const issues = await validateInline(
      "rust",
      "err-as-needed.md",
      "fn bad() {}",
      "fn good() {}",
      "Call free as needed.",
    );
    const vague = issues.filter((entry) => entry.code === "vague-condition");
    expect(vague).toHaveLength(1);
    expect(vague[0].severity).toBe("warning");
  });

  it("accepts 'as needed' next to a condition", async () => {
    const issues = await validateInline(
      "rust",
      "err-as-needed-ok.md",
      "fn bad() {}",
      "fn good() {}",
      "Call free as needed when the buffer is empty.",
    );
    expect(codes(issues)).not.toContain("vague-condition");
  });

  it("ignores hedging words inside code fences", async () => {
    const issues = await validateInline("rust", "err-hedge-code.md", "fn consider() {}", "fn good() {}");
    expect(codes(issues)).not.toContain("hedging");
  });
});

describe("validatePack", () => {
  it("accepts the valid fixture pack", async () => {
    const report = await validatePack(join(FIXTURES, "ok/rust"), { compile: false });
    expect(report.errors).toEqual([]);
    expect(report.ruleCount).toBe(2);
    expect(report.checkedCount).toBe(2);
  });

  it("flags INDEX.md mismatches in both directions", async () => {
    const report = await validatePack(join(FIXTURES, "bad-index/rust"), { compile: false });
    const list = codes(report.errors);
    expect(list).toContain("index-missing");
    expect(list).toContain("index-extra");
    expect(report.errors.filter((entry) => entry.code === "index-extra")).toHaveLength(1);
    expect(report.ruleCount).toBe(1);
  });

  it("does not count rules with errors as clean", async () => {
    const report = await validatePack(join(FIXTURES, "broken/rust"), { compile: false });
    expect(report.ruleCount).toBe(19);
    expect(report.checkedCount).toBeLessThan(report.ruleCount);
    expect(report.errors.filter((entry) => entry.code.startsWith("index"))).toEqual([]);
  });

  it("warns when the pack directory is missing", async () => {
    const report = await validatePack(join(FIXTURES, "does-not-exist"), { compile: false });
    expect(codes(report.warnings)).toContain("pack-missing");
    expect(report.ruleCount).toBe(0);
  });
});

describe("validateAll", () => {
  it("walks the language directories under the root", async () => {
    const report = await validateAll(join(FIXTURES, "ok"), { compile: false });
    expect(report.errors).toEqual([]);
    expect(report.ruleCount).toBe(2);
    expect(report.checkedCount).toBe(2);
  });

  it("warns when the root is missing", async () => {
    const report = await validateAll(join(FIXTURES, "missing-root"), { compile: false });
    expect(codes(report.warnings)).toContain("root-missing");
    expect(report.ruleCount).toBe(0);
  });
});

describe("compilation harness integration", () => {
  it("compiles valid snippets and records the compiler", async () => {
    const result = await validateFile(join(FIXTURES, "ok/rust/err-result.md"), { knownIds: KNOWN_OK });
    expect(result.compile).toHaveLength(2);
    if (result.compile.every((check) => check.result.skipped)) return;
    for (const check of result.compile) {
      expect(check.result.skipped, check.result.output).toBe(false);
      expect(check.result.ok, check.result.output).toBe(true);
      expect(check.result.compiler).toContain("rustc");
    }
    expect(result.issues.filter((entry) => entry.severity === "error")).toEqual([]);
  }, 60_000);

  it("reports compile failures for otherwise-valid rules", async () => {
    const result = await validateFile(join(FIXTURES, "bad-compile/rust/err-broken-snippet.md"), {});
    const list = codes(result.issues);
    if (result.compile.every((check) => check.result.skipped)) {
      expect(list).toContain("compile-skipped");
    } else {
      expect(list).toContain("compile-failed");
      const failed = result.issues.find((entry) => entry.code === "compile-failed");
      expect(failed?.message).toContain("rustc");
    }
  }, 60_000);

  it("skips compilation when errors are already present", async () => {
    const result = await validateFile(join(FIXTURES, "broken/rust/err-bad-id.md"), { compile: true });
    expect(result.compile).toEqual([]);
  });

  it("honors compile_exempt and still counts the rule as checked", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-exempt-"));
    const packDir = join(dir, "rust");
    await mkdir(packDir, { recursive: true });
    const file = join(packDir, "err-exempt.md");
    const content = inlineRuleContent("rust", "err-exempt", "fn bad( {", "fn good() {}", [
      "compile_exempt: edition-2024 static_mut_refs demonstration",
    ]);
    await writeFile(file, content, "utf-8");
    await writeFile(
      join(packDir, "INDEX.md"),
      "# Rust Rules Index\n\nBaseline: latest\nRules: 1 (verified: 0)\n\n## err - Error handling (1)\n\n- [err-exempt](err-exempt.md) - exempt fixture\n",
      "utf-8",
    );
    try {
      const result = await validateFile(file, { knownIds: new Set() });
      expect(result.compile).toEqual([]);
      const exempt = result.issues.filter((entry) => entry.code === "compile-exempt");
      expect(exempt).toHaveLength(1);
      expect(exempt[0].severity).toBe("warning");
      expect(result.issues.filter((entry) => entry.severity === "error")).toEqual([]);
      expect(result.rule?.compile_exempt).toBe("edition-2024 static_mut_refs demonstration");

      const report = await validatePack(packDir, { knownIds: new Set() });
      expect(report.errors).toEqual([]);
      expect(report.ruleCount).toBe(1);
      expect(report.checkedCount).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("frontmatter and body edge cases", () => {
  const DEFAULT_BODY = [
    "",
    "> Use the rule under test.",
    "",
    "## Why",
    "",
    "Because it matters.",
    "",
    "## Bad",
    "",
    "```rust",
    "fn bad() {}",
    "```",
    "",
    "## Good",
    "",
    "```rust",
    "fn good() {}",
    "```",
    "",
  ].join("\n");

  function fmLines(
    overrides: Record<string, string | undefined> = {},
    sources: string[] = ["sources:", "  - title: Example source", "    url: https://example.com/spec"],
  ): string[] {
    const base: Record<string, string | undefined> = {
      id: "rust-err-edge",
      lang: "rust",
      prefix: "err",
      title: "An edge case rule",
      severity: "must",
      enforce: "review",
      baseline: "latest",
      status: "draft",
    };
    const merged = { ...base, ...overrides };
    const lines = Object.entries(merged)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);
    return [...lines, ...sources];
  }

  async function validateRaw(
    fileName: string,
    frontmatter: string[],
    body = DEFAULT_BODY,
    options: ValidateOptions = { compile: false, knownIds: new Set() },
    dirName = "rust",
  ): Promise<FileValidationResult> {
    const dir = await mkdtemp(join(tmpdir(), "rules-edge-"));
    const packDir = join(dir, dirName);
    await mkdir(packDir, { recursive: true });
    const file = join(packDir, fileName);
    await writeFile(file, ["---", ...frontmatter, "---", body].join("\n"), "utf-8");
    try {
      return await validateFile(file, options);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("collects required-field, enum, and field-type issues together", async () => {
    const result = await validateRaw("err-edge.md", [
      "id: rust-err-edge",
      "lang: rust",
      "prefix: err",
      "title: T",
      "severity: sometimes",
      "enforce: nope",
      "baseline: latest",
      "status: live",
      "tool: []",
      "compile_exempt: []",
      "triggers: nope",
      "related: nope",
      "sources:",
      "  - title: S",
      "    url: https://example.com/x",
    ]);

    const list = codes(result.issues);
    expect(list.filter((code) => code === "enum")).toHaveLength(3);
    expect(list.filter((code) => code === "field-type")).toHaveLength(4);
    expect(result.rule).toBeNull();
  });

  it("requires a tool id for tool enforcement and validates trigger shapes", async () => {
    const result = await validateRaw("err-edge.md", [
      ...fmLines({ enforce: "tool" }),
      'triggers: { keywords: "x", files: [1] }',
    ]);

    const list = codes(result.issues);
    expect(list).toContain("tool-required");
    expect(list.filter((code) => code === "field-type")).toHaveLength(2);
  });

  it("accepts well-formed triggers and resolves published sibling ids", async () => {
    const result = await validateRaw(
      "err-edge.md",
      [
        ...fmLines(),
        'triggers: { keywords: [retry], files: ["*.ts"], symbols: [Foo] }',
        "related: [rust-other]",
      ],
      DEFAULT_BODY,
      { compile: false, knownIds: new Set(["rust-other"]) },
    );

    const list = codes(result.issues);
    expect(list).not.toContain("field-type");
    expect(list).not.toContain("related-unresolved");
    expect(result.rule?.related).toEqual(["rust-other"]);
    expect(result.rule?.triggers).toEqual({
      keywords: ["retry"],
      files: ["*.ts"],
      symbols: ["Foo"],
    });
  });

  it("reports malformed sources entries and missing sources", async () => {
    const notMapping = await validateRaw("err-edge.md", fmLines({}, ["sources: [42]"]));
    expect(codes(notMapping.issues)).toContain("source-title");

    const missingTitle = await validateRaw("err-edge.md", [
      ...fmLines({}, ["sources: [{url: https://example.com/x}]"]),
    ]);
    expect(codes(missingTitle.issues)).toContain("source-title");

    const badTypes = await validateRaw("err-edge.md", [
      ...fmLines({}, ["sources: [{title: 42, url: 42}]"]),
    ]);
    expect(codes(badTypes.issues)).toContain("source-title");
    expect(codes(badTypes.issues)).toContain("source-url");

    const empty = await validateRaw("err-edge.md", fmLines({}, ["sources: []"]));
    expect(codes(empty.issues)).toContain("source-missing");
  });

  it("flags a lang that does not match the directory", async () => {
    const result = await validateRaw(
      "err-edge.md",
      fmLines({ lang: "go", id: "go-err-edge" }),
      DEFAULT_BODY,
      { compile: false, knownIds: new Set() },
      "rust",
    );

    expect(codes(result.issues)).toContain("lang-dir-mismatch");
  });

  it("returns read-failed for an unreadable rule path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-unreadable-"));
    const packDir = join(dir, "rust");
    await mkdir(packDir, { recursive: true });
    try {
      const result = await validateFile(packDir, { compile: false });
      expect(codes(result.issues)).toContain("read-failed");
      expect(result.rule).toBeNull();
      expect(result.compile).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports a missing summary and dangling fences", async () => {
    const noSummary = await validateRaw("err-edge.md", fmLines(), "\n\nOnly prose without a summary.\n");
    expect(codes(noSummary.issues)).toContain("summary-missing");

    const dangling = await validateRaw(
      "err-edge.md",
      fmLines(),
      ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```rust", "fn bad() {}", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n"),
    );
    expect(codes(dangling.issues)).toContain("fence-count");
  });

  it("warns on long snippets and untagged fences", async () => {
    const longBad = Array.from({ length: 26 }, (_, index) => `fn bad${index}() {}`).join("\n");
    const longBody = ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```rust", longBad, "```", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n");
    const long = await validateRaw("err-edge.md", fmLines(), longBody);
    const tooLong = long.issues.filter((entry) => entry.code === "snippet-too-long");
    expect(tooLong).toHaveLength(1);
    expect(tooLong[0].severity).toBe("warning");

    const untaggedBody = ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```", "fn bad() {}", "```", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n");
    const untagged = await validateRaw("err-edge.md", fmLines(), untaggedBody);
    const fenceIssue = untagged.issues.find((entry) => entry.code === "fence-language");
    expect(fenceIssue?.message).toContain("no tag");
  });

  it("dedupes forbidden tokens and hedging words across the body", async () => {
    const hedgedBody = ["", "> ok", "", "## Why", "", "TODO todo consider consider this.", "", "## Bad", "", "```rust", "fn bad() {}", "```", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n");
    const result = await validateRaw("err-edge.md", fmLines(), hedgedBody);
    const tokens = result.issues.filter((entry) => entry.code === "forbidden-token");
    const hedges = result.issues.filter((entry) => entry.code === "hedging");
    expect(tokens).toHaveLength(1);
    expect(hedges).toHaveLength(1);
  });

  it("flags 'as needed' at the first and last body lines", async () => {
    const firstBody = ["> Call as needed.", "", "## Why", "", "text", "", "## Bad", "", "```rust", "fn bad() {}", "```", "", "## Good", "", "```rust", "fn good() {}", "```"].join("\n");
    const first = await validateRaw("err-edge.md", fmLines(), firstBody);
    expect(first.issues.filter((entry) => entry.code === "vague-condition")).toHaveLength(1);

    const lastBody = ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```rust", "fn bad() {}", "```", "", "## Good", "", "```rust", "fn good() {}", "```", "Call as needed."].join("\n");
    const last = await validateRaw("err-edge.md", fmLines(), lastBody);
    expect(last.issues.filter((entry) => entry.code === "vague-condition")).toHaveLength(1);
  });

  it("warns on elisions inside single-line and multi-line block comments", async () => {
    const singleBody = ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```rust", "/* ... */", "```", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n");
    const single = await validateRaw("err-edge.md", fmLines(), singleBody);
    expect(single.issues.filter((entry) => entry.code === "comment-elision")).toHaveLength(1);

    const multiBody = ["", "> ok", "", "## Why", "", "text", "", "## Bad", "", "```rust", "/* start", "... end */", "```", "", "## Good", "", "```rust", "fn good() {}", "```", ""].join("\n");
    const multi = await validateRaw("err-edge.md", fmLines(), multiBody);
    expect(multi.issues.filter((entry) => entry.code === "comment-elision")).toHaveLength(1);
  });
});

describe("pack and catalog edge cases", () => {
  it("reports INDEX.md read failures and bad link targets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-index-"));
    const packDir = join(dir, "rust");
    await mkdir(join(packDir, "INDEX.md"), { recursive: true });
    await writeFile(join(packDir, "err-edge.md"), inlineRuleContent("rust", "err-edge", "fn bad() {}", "fn good() {}"), "utf-8");
    try {
      const failed = await validatePack(packDir, { compile: false });
      expect(codes(failed.errors)).toContain("read-failed");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }

    const dir2 = await mkdtemp(join(tmpdir(), "rules-index-links-"));
    const packDir2 = join(dir2, "rust");
    await mkdir(packDir2, { recursive: true });
    await writeFile(join(packDir2, "err-edge.md"), inlineRuleContent("rust", "err-edge", "fn bad() {}", "fn good() {}"), "utf-8");
    await writeFile(
      join(packDir2, "INDEX.md"),
      [
        "# Rust Rules Index",
        "",
        "- [edge](err-edge.md)",
        "- [image](image.png)",
        "- [nested](sub/rule.md)",
        "- [web](https://example.com/x)",
        "",
      ].join("\n"),
      "utf-8",
    );
    try {
      const report = await validatePack(packDir2, { compile: false });
      const extras = report.errors.filter((entry) => entry.code === "index-extra");
      expect(extras).toHaveLength(2);
      expect(extras.map((entry) => entry.message).join(" ")).toContain("image.png");
      expect(extras.map((entry) => entry.message).join(" ")).toContain("sub/rule.md");
    } finally {
      await rm(dir2, { recursive: true, force: true });
    }
  });

  it("reports read failures when pack and catalog roots are files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-file-root-"));
    const file = join(dir, "not-a-directory.md");
    await writeFile(file, "x\n", "utf-8");
    try {
      const pack = await validatePack(file, { compile: false });
      expect(codes(pack.errors)).toContain("read-failed");
      expect(pack.ruleCount).toBe(0);

      const all = await validateAll(file, { compile: false });
      expect(codes(all.errors)).toContain("read-failed");
      expect(all.ruleCount).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("discovers sibling ids and falls back for unreadable catalog entries", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-known-"));
    const packDir = join(dir, "rust");
    await mkdir(join(packDir, "broken.md"), { recursive: true });
    await writeFile(join(packDir, "other.md"), inlineRuleContent("rust", "other", "fn bad() {}", "fn good() {}"), "utf-8");
    await writeFile(
      join(packDir, "err-edge.md"),
      inlineRuleContent("rust", "err-edge", "fn bad() {}", "fn good() {}", ["related: [rust-other]"]),
      "utf-8",
    );
    try {
      const direct = await validateFile(join(packDir, "err-edge.md"), { compile: false });
      expect(codes(direct.issues)).not.toContain("related-unresolved");

      const report = await validatePack(packDir, { compile: false });
      expect(codes(report.errors)).not.toContain("related-unresolved");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to pack-local ids when the parent has no language dirs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rules-parent-"));
    const packDir = join(dir, "mypack");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      join(packDir, "err-edge.md"),
      inlineRuleContent("rust", "err-edge", "fn bad() {}", "fn good() {}", ["related: [rust-other]"]),
      "utf-8",
    );
    await writeFile(join(packDir, "INDEX.md"), "# Index\n\n- [err-edge](err-edge.md)\n", "utf-8");
    try {
      const report = await validatePack(packDir, { compile: false });
      expect(codes(report.errors)).toContain("related-unresolved");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
