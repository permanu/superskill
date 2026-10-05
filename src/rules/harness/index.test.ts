// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { HarnessResult, RuleLanguage } from "../types.js";
import { compileSnippet } from "./index.js";

const VALID: Record<RuleLanguage, string> = {
  rust: "pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}",
  typescript: "export function add(a: number, b: number): number {\n  return a + b;\n}",
  python: "def add(a: int, b: int) -> int:\n    return a + b",
  go: "package main\n\nfunc add(a int, b int) int {\n\treturn a + b\n}\n\nfunc main() {\n\t_ = add(1, 2)\n}",
  swift: "func add(_ a: Int, _ b: Int) -> Int {\n    a + b\n}",
  java: "public class Snippet {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}",
  c: "int add(int a, int b) {\n    return a + b;\n}",
  cpp: "int add(int a, int b) {\n    return a + b;\n}",
};

const INVALID: Record<RuleLanguage, string> = {
  rust: "pub fn add( {",
  typescript: "export function add(a: number: number {",
  python: "def add(a, b:\n    return a + b",
  go: "package main\n\nfunc add(a int, b int) int {",
  swift: "func add(_ a: Int, -> Int {",
  java: "public class Snippet {\n    int add( {\n}",
  c: "int add( {",
  cpp: "int add( {",
};

const LANGS = Object.keys(VALID) as RuleLanguage[];

function expectOkOrSkipped(result: HarnessResult, label: string): void {
  if (result.skipped) {
    expect(result.compiler).toBe("skipped");
    expect(result.output.length).toBeGreaterThan(0);
    return;
  }
  expect(result.ok, `${label}: ${result.output}`).toBe(true);
  expect(result.compiler).not.toBe("skipped");
  expect(result.compiler.length).toBeGreaterThan(0);
}

function expectFailOrSkipped(result: HarnessResult, label: string): void {
  if (result.skipped) {
    expect(result.compiler).toBe("skipped");
    return;
  }
  expect(result.ok, `${label} unexpectedly compiled`).toBe(false);
  expect(result.output.length).toBeGreaterThan(0);
}

describe.each(LANGS)("compileSnippet(%s)", (lang) => {
  it("accepts a valid snippet or skips cleanly", async () => {
    expectOkOrSkipped(await compileSnippet(lang, VALID[lang]), `${lang} valid`);
  }, 60_000);

  it("rejects a broken snippet or skips cleanly", async () => {
    expectFailOrSkipped(await compileSnippet(lang, INVALID[lang]), `${lang} invalid`);
  }, 60_000);
});

describe("fragment wrapping", () => {
  it("wraps Rust statement fragments in a main function", async () => {
    expectOkOrSkipped(await compileSnippet("rust", "let x = 1;\nlet _y = x;"), "rust fragment");
  }, 60_000);

  it("wraps C statements in main with common includes", async () => {
    expectOkOrSkipped(await compileSnippet("c", 'int x = 1;\nprintf("%d", x);'), "c fragment");
  }, 60_000);

  it("wraps C++ statements in main with common includes", async () => {
    expectOkOrSkipped(await compileSnippet("cpp", 'std::cout << "hi" << std::endl;'), "cpp fragment");
  }, 60_000);

  it("wraps Go declarations in package main", async () => {
    expectOkOrSkipped(await compileSnippet("go", "func add(a int, b int) int {\n\treturn a + b\n}"), "go fragment");
  }, 60_000);

  it("wraps Java statements in a class with main", async () => {
    expectOkOrSkipped(
      await compileSnippet("java", "int x = 1;\nSystem.out.println(x);"),
      "java statements",
    );
  }, 60_000);

  it("wraps Java method declarations in a class", async () => {
    expectOkOrSkipped(
      await compileSnippet("java", "public static int add(int a, int b) { return a + b; }"),
      "java methods",
    );
  }, 60_000);

  it("compiles Java package-info snippets as compilation units", async () => {
    expectOkOrSkipped(
      await compileSnippet("java", "/**\n * Package documentation for the example module.\n */\npackage com.example.app;\n"),
      "java package-info",
    );
  }, 60_000);

  it("compiles Java module-info snippets as compilation units", async () => {
    expectOkOrSkipped(
      await compileSnippet(
        "java",
        "/**\n * Module descriptor for the example module.\n */\nmodule com.example.app {\n    requires java.base;\n}\n",
      ),
      "java module-info",
    );
  }, 60_000);
});

describe("compileSnippet edge cases", () => {
  it("skips languages without a harness", async () => {
    const result = await compileSnippet("brainfuck", "+++");
    expect(result.skipped).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.compiler).toBe("skipped");
  });

  it("rejects empty snippets without invoking a toolchain", async () => {
    const result = await compileSnippet("rust", "   \n");
    expect(result.skipped).toBe(false);
    expect(result.ok).toBe(false);
  });
});
