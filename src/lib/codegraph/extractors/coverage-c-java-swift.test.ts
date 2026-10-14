import { describe, expect, it } from "vitest";
import { getParser, loadLanguage } from "../grammars.js";
import type { CodeNode, CodeNodeKind, ExtractResult, Span, SyntaxNode } from "../types.js";
import { declaratorName, includeSpecifier } from "./c.js";
import { externalNodeId, moduleNodeId } from "./common.js";
import { extractorFor } from "./index.js";

const files = { c: "forms.c", java: "Forms.java", swift: "Forms.swift", python: "forms.py", go: "forms.go", cpp: "forms.cpp" };

async function parse(language: keyof typeof files, source: string, inspect?: (root: SyntaxNode) => void): Promise<ExtractResult & { hasError: boolean }> {
  const parser = await getParser();
  parser.setLanguage(await loadLanguage(language));
  const tree = parser.parse(source);
  try {
    inspect?.(tree.rootNode);
    const file = files[language];
    const result = extractorFor(language)({ file, source, tree, language });
    const ids = new Set(result.nodes.map(node => node.id));
    expect(ids.size).toBe(result.nodes.length);
    for (const entry of [...result.nodes, ...result.edges, ...result.imports]) {
      expect(entry.span.startLine).toBeGreaterThanOrEqual(1);
      expect(entry.span.endLine).toBeGreaterThanOrEqual(entry.span.startLine);
      expect(entry.span.endLine).toBeLessThanOrEqual(source.split("\n").length);
    }
    for (const edge of result.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
      expect(edge.file).toBe(file);
      expect(edge.confidence).toBe(edge.kind === "calls" || edge.kind === "references" ? "INFERRED" : "EXTRACTED");
    }
    expect(result.nodes.find(node => node.kind === "module")).toMatchObject({ id: moduleNodeId(file), name: file, file, language });
    return { ...result, hasError: tree.rootNode.hasError };
  } finally {
    tree.delete();
  }
}

function symbol(result: ExtractResult, name: string, kind: CodeNodeKind, span?: Span): CodeNode {
  const node = result.nodes.find(candidate => candidate.name === name && candidate.kind === kind && (!span || candidate.span.startLine === span.startLine));
  expect(node, `${kind} ${name}`).toBeDefined();
  if (span) expect(node!.span).toEqual(span);
  return node!;
}

function link(result: ExtractResult, from: string, to: string, kind: "calls" | "references" | "defines" | "exports" | "imports", span?: Span): void {
  const edge = result.edges.find(candidate => candidate.from === from && candidate.to === to && candidate.kind === kind);
  expect(edge, `${kind} ${from} -> ${to}`).toBeDefined();
  if (span) expect(edge!.span).toEqual(span);
}

function descendants(root: SyntaxNode, type: string): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.type === type) found.push(node);
    pending.push(...node.namedChildren);
  }
  return found;
}

describe("C real-grammar declaration and recovery coverage", () => {
  it("separates aliases, named and anonymous tags, and unresolved forward declarations", async () => {
    const result = await parse("c", [
      "typedef int Count;",
      "typedef struct { int value; } Box;",
      "typedef union Storage { int number; char byte; } Store;",
      "enum Flag { Ready = 1, Waiting };",
      "struct Forward;",
      "union Unseen;",
      "enum Pending;",
      "enum { Anonymous } anonymous;",
      "void consume(Count count, Box box, Store store, enum Flag flag, struct Forward *unknown) {}",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const count = symbol(result, "Count", "type", { startLine: 1, endLine: 1 });
    const box = symbol(result, "Box", "class", { startLine: 2, endLine: 2 });
    const storage = symbol(result, "Storage", "class", { startLine: 3, endLine: 3 });
    const store = symbol(result, "Store", "class", { startLine: 3, endLine: 3 });
    const flag = symbol(result, "Flag", "type", { startLine: 4, endLine: 4 });
    const consume = symbol(result, "consume", "function", { startLine: 9, endLine: 9 });
    for (const target of [count, box, store, flag]) link(result, consume.id, target.id, "references", { startLine: 9, endLine: 9 });
    link(result, moduleNodeId(files.c), storage.id, "defines");
    expect(result.nodes.some(node => ["Forward", "Unseen", "Pending", "Anonymous"].includes(node.name))).toBe(false);
    expect(result.edges.some(edge => edge.kind === "exports")).toBe(false);
  });

  it("tracks direct calls and supported global bindings without inventing pointer-call targets", async () => {
    const result = await parse("c", [
      "int helper(int value) { return value; }",
      "int prototype(int);",
      "int active = 7, *pointer = 0, array[2] = {0};",
      "int (*factory(void))(int) { return helper; }",
      "void caller(void) {",
      "  int local = helper(1);",
      "  int prototype(int);",
      "  int (*callback)(int) = helper;",
      "  callback(2);",
      "  (*callback)(3);",
      "  array[0](4);",
      "  helper(5);",
      "}",
      "typedef int (*Callback)(int);",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const helper = symbol(result, "helper", "function");
    const caller = symbol(result, "caller", "function", { startLine: 5, endLine: 13 });
    symbol(result, "factory", "function", { startLine: 4, endLine: 4 });
    symbol(result, "active", "const", { startLine: 3, endLine: 3 });
    link(result, caller.id, helper.id, "calls", { startLine: 6, endLine: 6 });
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls")).toHaveLength(1);
    expect(result.nodes.some(node => ["pointer", "array", "local", "callback", "Callback"].includes(node.name))).toBe(false);
    expect(result.nodes.filter(node => node.name === "prototype")).toHaveLength(2);
  });

  it("extracts literal and macro includes and handles nameless helper inputs from real nodes", async () => {
    const result = await parse("c", [
      '#define HEADER "local.h"',
      "#include HEADER",
      '#include ""',
      '#include "local.h"',
      "#include <stddef.h>",
      "int value = 1;",
    ].join("\n"), root => {
      expect(includeSpecifier(root)).toBeNull();
      expect(declaratorName(null)).toBeNull();
      expect(declaratorName(descendants(root, "number_literal")[0])).toBeNull();
      expect(descendants(root, "preproc_include").map(includeSpecifier).sort()).toEqual(["", "<stddef.h>", "HEADER", "local.h"]);
    });
    expect(result.hasError).toBe(false);
    expect(result.imports.map(item => item.specifier).sort()).toEqual(["<stddef.h>", "HEADER", "local.h"]);
    link(result, moduleNodeId(files.c), externalNodeId("HEADER", "*"), "imports", { startLine: 2, endLine: 3 });
    expect(result.imports.some(item => item.specifier === "")).toBe(false);
  });

  it("recovers named declarations after malformed includes and missing declarator names", async () => {
    const result = await parse("c", [
      "#include <",
      "int (*)(int) { return 1; }",
      "int () { return 1; }",
      "enum {};",
      "int recovered(void) { return 1; }",
    ].join("\n"));
    expect(result.hasError).toBe(true);
    expect(result.nodes.filter(node => node.kind === "function").map(node => node.name)).toEqual(["recovered"]);
    symbol(result, "recovered", "function", { startLine: 5, endLine: 5 });
    expect(result.imports).toEqual([]);
    expect(result.edges.filter(edge => edge.kind === "calls")).toEqual([]);
  });

  it("reads shared C declarator helpers against real qualified C++ syntax", async () => {
    await parse("cpp", [
      "namespace util { struct Box { int field; ~Box(); int operator+(int); }; int function(int); }",
      "int util::function(int value) { return value; }",
      "util::Box::~Box() {}",
      "int util::Box::operator+(int value) { return value; }",
    ].join("\n"), root => {
      const qualified = descendants(root, "function_definition").map(node => declaratorName(node.childForFieldName("declarator")));
      expect(qualified.sort()).toEqual(["function", "operator+", "~Box"]);
      expect(descendants(root, "destructor_name").map(declaratorName)).toContain("~Box");
      expect(descendants(root, "operator_name").map(declaratorName)).toContain("operator+");
      expect(descendants(root, "field_identifier").map(declaratorName)).toContain("field");
    });
  });
});

describe("Java real-grammar hierarchy and member coverage", () => {
  it.each([
    ["import java.util.*;", "java.util"],
    ["import widgets.*;", "widgets"],
    ["import static pkg.Tools.*;", "pkg.Tools"],
  ])("records %s as the actual wildcard source without guessing its members", async (statement, specifier) => {
    const result = await parse("java", `${statement}\nclass Client { void use() { unknown(); } }`);
    expect(result.hasError).toBe(false);
    expect(result.imports).toEqual([{ specifier, bindings: ["*"], span: { startLine: 1, endLine: 1 } }]);
    expect(result.nodes.filter(node => node.kind === "import-source").map(node => node.id)).toEqual([externalNodeId(specifier, "*")]);
    link(result, moduleNodeId(files.java), externalNodeId(specifier, "*"), "imports", { startLine: 1, endLine: 1 });
    expect(result.edges.filter(edge => edge.kind === "calls")).toEqual([]);
  });

  it("extracts interfaces, records, enums and visibility while keeping hierarchy references inferred", async () => {
    const result = await parse("java", [
      "interface Root {}",
      "interface Child extends Root {}",
      "class Base {}",
      "public class Derived extends Base implements Child, Root {",
      "  protected int count, other;",
      "  private String hidden;",
      "  public Derived() {}",
      "  private void work() {}",
      "}",
      "record Pair(int left, int right) {}",
      "public enum Mode { ON, OFF; private int ignored; }",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const root = symbol(result, "Root", "interface");
    const child = symbol(result, "Child", "interface");
    const base = symbol(result, "Base", "class");
    const derived = symbol(result, "Derived", "class", { startLine: 4, endLine: 9 });
    expect(derived.exported).toBe(true);
    expect(symbol(result, "count", "const").exported).toBe(true);
    expect(symbol(result, "other", "const").exported).toBe(true);
    expect(symbol(result, "hidden", "const").exported).toBeUndefined();
    symbol(result, "Pair", "class", { startLine: 10, endLine: 10 });
    const mode = symbol(result, "Mode", "type", { startLine: 11, endLine: 11 });
    for (const name of ["ON", "OFF"]) link(result, mode.id, symbol(result, name, "const").id, "defines");
    link(result, child.id, root.id, "references", { startLine: 2, endLine: 2 });
    for (const target of [base, child, root]) link(result, derived.id, target.id, "references", { startLine: 4, endLine: 4 });
    expect(result.nodes.some(node => ["left", "right", "ignored"].includes(node.name))).toBe(false);
  });

  it("distinguishes static imports, local and this calls, and unresolved chained receivers", async () => {
    const result = await parse("java", [
      "import static pkg.Tools.run;",
      "import pkg.Helpers;",
      "class Client {",
      "  void target() {}",
      "  void execute() {",
      "    this.target();",
      "    run();",
      "    Helpers.work();",
      "    unknown.work();",
      "    new Client().target();",
      "    (factory()).target();",
      "    target();",
      "  }",
      "}",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const target = symbol(result, "target", "method");
    const execute = symbol(result, "execute", "method", { startLine: 5, endLine: 13 });
    link(result, moduleNodeId(files.java), externalNodeId("pkg.Tools", "run"), "imports", { startLine: 1, endLine: 1 });
    link(result, execute.id, target.id, "calls", { startLine: 6, endLine: 6 });
    link(result, execute.id, externalNodeId("pkg.Tools", "run"), "calls", { startLine: 7, endLine: 7 });
    link(result, execute.id, externalNodeId("pkg.Helpers", "Helpers"), "calls", { startLine: 8, endLine: 8 });
    expect(result.edges.filter(edge => edge.from === execute.id && edge.kind === "calls")).toHaveLength(3);
    expect(result.nodes.some(node => node.name === "unknown" || node.name === "factory")).toBe(false);
  });

  it("walks generic supertype nodes and tolerates an incomplete invocation without fabricating a target", async () => {
    const generic = await parse("java", [
      "class Base<T> {}",
      "interface Contract<T> {}",
      "class Generic<T> extends Base<T> implements Contract<T> {}",
    ].join("\n"));
    expect(generic.hasError).toBe(false);
    const derived = symbol(generic, "Generic", "class");
    for (const [name, kind] of [["Base", "class"], ["Contract", "interface"]] as const) link(generic, derived.id, symbol(generic, name, kind).id, "references");
    const malformed = await parse("java", "class Recovered { void run() { this.(); } }");
    expect(malformed.hasError).toBe(true);
    symbol(malformed, "Recovered", "class", { startLine: 1, endLine: 1 });
    symbol(malformed, "run", "method", { startLine: 1, endLine: 1 });
    expect(malformed.edges.filter(edge => edge.kind === "calls")).toEqual([]);
    const unsupported = await parse("java", "import Single;\nthis.unknown();");
    expect(unsupported.imports).toEqual([]);
    expect(unsupported.edges.filter(edge => edge.kind === "calls")).toEqual([]);
  });
});

describe("Swift real-grammar type and recovery coverage", () => {
  it.each(["target()", "self.target()"])("resolves %s to the enclosing class rather than earlier same-named methods", async call => {
    const result = await parse("swift", [
      "protocol Contract {",
      "  func target()",
      "}",
      "class Earlier {",
      "  func target() {}",
      "}",
      "class Client: Contract {",
      `  func caller() { ${call} }`,
      "  func target() {}",
      "}",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const client = symbol(result, "Client", "class");
    const caller = symbol(result, "caller", "method", { startLine: 8, endLine: 8 });
    const target = symbol(result, "target", "method", { startLine: 9, endLine: 9 });
    link(result, client.id, target.id, "defines");
    link(result, caller.id, target.id, "calls", { startLine: 8, endLine: 8 });
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls").map(edge => edge.to)).toEqual([target.id]);
  });

  it("records protocol requirements, lifecycle members and direct function calls with exact ownership", async () => {
    const result = await parse("swift", [
      "public protocol Formatter {",
      "  func render() -> String",
      "}",
      "open class Base {}",
      "public class Client: Base, Formatter {",
      "  public init() {}",
      "  deinit { cleanup() }",
      '  public func render() -> String { return "ok" }',
      '  func format() -> String { return "ok" }',
      "  func execute() { format() }",
      "}",
      "func cleanup() {}",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const formatter = symbol(result, "Formatter", "interface", { startLine: 1, endLine: 3 });
    const client = symbol(result, "Client", "class", { startLine: 5, endLine: 11 });
    const format = symbol(result, "format", "method", { startLine: 9, endLine: 9 });
    const execute = symbol(result, "execute", "method");
    const deinit = symbol(result, "deinit", "method", { startLine: 7, endLine: 7 });
    expect(client.exported).toBe(true);
    expect(symbol(result, "Base", "class").exported).toBe(true);
    link(result, formatter.id, symbol(result, "render", "method", { startLine: 2, endLine: 2 }).id, "defines");
    link(result, client.id, symbol(result, "init", "method").id, "defines");
    link(result, client.id, deinit.id, "defines");
    link(result, execute.id, format.id, "calls", { startLine: 10, endLine: 10 });
    link(result, deinit.id, symbol(result, "cleanup", "function").id, "calls", { startLine: 7, endLine: 7 });
    link(result, client.id, formatter.id, "references", { startLine: 5, endLine: 5 });
  });

  it("handles enum entries, aliases, extension scopes and supported property patterns", async () => {
    const result = await parse("swift", [
      "public struct Point {",
      "  let value = 1",
      "}",
      "enum Mode {",
      "  case on",
      "  case off(Int)",
      "}",
      "public typealias Count = Int",
      "extension Point {",
      "  func extra() {}",
      "}",
      "let (left, right) = (1, 2)",
      "var _ = 1",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const mode = symbol(result, "Mode", "class");
    for (const name of ["on", "off"]) link(result, mode.id, symbol(result, name, "const").id, "defines");
    const extension = symbol(result, "Point", "class", { startLine: 9, endLine: 11 });
    link(result, extension.id, symbol(result, "extra", "method").id, "defines");
    expect(symbol(result, "Count", "type", { startLine: 8, endLine: 8 }).exported).toBe(true);
    symbol(result, "left", "const", { startLine: 12, endLine: 12 });
    expect(result.nodes.some(node => node.name === "_" || node.name === "right")).toBe(false);
  });

  it("records qualified import placeholders but does not claim chained or indirect call targets", async () => {
    const result = await parse("swift", [
      "import Foundation.NSObject",
      "class Local {}",
      "func factory() -> Local { return Local() }",
      "func target() {}",
      "func caller() {",
      "  NSObject.work()",
      "  Local.work()",
      "  factory().work()",
      "  (target)()",
      "}",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const caller = symbol(result, "caller", "function");
    link(result, moduleNodeId(files.swift), externalNodeId("Foundation.NSObject", "NSObject"), "imports");
    link(result, caller.id, externalNodeId("Foundation.NSObject", "NSObject"), "calls", { startLine: 6, endLine: 6 });
    link(result, caller.id, symbol(result, "Local", "class").id, "references", { startLine: 7, endLine: 7 });
    link(result, caller.id, symbol(result, "factory", "function").id, "calls", { startLine: 8, endLine: 8 });
    expect(result.edges.some(edge => edge.from === caller.id && edge.to === symbol(result, "target", "function").id && edge.kind === "calls")).toBe(false);
  });

  it("skips missing declaration names and still extracts later well-formed declarations", async () => {
    const result = await parse("swift", [
      "extension {}",
      "class : Base {}",
      "protocol {}",
      "func () {}",
      "typealias = Int",
      "let _ = 1",
      "func recovered() {}",
    ].join("\n"));
    expect(result.hasError).toBe(true);
    expect(result.nodes.filter(node => node.kind !== "module").map(node => node.name)).toEqual(["recovered"]);
    symbol(result, "recovered", "function", { startLine: 7, endLine: 7 });
    const missingSuffix = await parse("swift", "func caller() { value.() }");
    expect(missingSuffix.hasError).toBe(true);
    expect(missingSuffix.edges.filter(edge => edge.kind === "calls")).toEqual([]);
  });

  it("does not emit missing protocol, enum or property names after parser recovery", async () => {
    const result = await parse("swift", [
      "protocol Contract {",
      "  func ()",
      "}",
      "enum Mode {",
      "  case (Int)",
      "  case = 1",
      "}",
      "var = 1",
      "var : Int",
      "func recovered() {}",
    ].join("\n"));
    expect(result.hasError).toBe(true);
    symbol(result, "Contract", "interface", { startLine: 1, endLine: 3 });
    symbol(result, "Mode", "class", { startLine: 4, endLine: 7 });
    symbol(result, "recovered", "function", { startLine: 10, endLine: 10 });
    expect(result.nodes.filter(node => node.kind !== "module").map(node => node.name)).toEqual(["Contract", "Mode", "recovered"]);
    expect(result.edges.some(edge => edge.kind === "calls")).toBe(false);
  });
});

describe("Python real-grammar alias and nested expression coverage", () => {
  it.each([
    ["from package.tools import run as local", "package.tools", ["run"]],
    ["from tools import run, VALUE", "tools", ["run", "VALUE"]],
    ["from .tools import run as local", ".tools", ["run"]],
    ["from helpers import *", "helpers", ["*"]],
    ["from package import package", "package", ["package"]],
  ] as const)("records only imported bindings for %s", async (statement, specifier, bindings) => {
    const result = await parse("python", statement);
    expect(result.hasError).toBe(false);
    expect(result.imports).toEqual([{ specifier, bindings: [...bindings], span: { startLine: 1, endLine: 1 } }]);
    expect(result.nodes.filter(node => node.kind === "import-source").map(node => node.id)).toEqual(bindings.map(binding => externalNodeId(specifier, binding)));
  });

  it("does not invent a module binding or module call from a member-only import", async () => {
    const result = await parse("python", [
      "from tools import run as local",
      "def caller():",
      "    tools()",
      "    local()",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const caller = symbol(result, "caller", "function");
    link(result, caller.id, externalNodeId("tools", "run"), "calls", { startLine: 4, endLine: 4 });
    expect(result.nodes.some(node => node.id === externalNodeId("tools", "tools"))).toBe(false);
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls").map(edge => edge.to)).toEqual([externalNodeId("tools", "run")]);
  });

  it("binds module and member aliases, relative and wildcard imports without treating wildcard names as known", async () => {
    const result = await parse("python", [
      "import package.deep as alias",
      "from package.tools import run as local",
      "from . import sibling",
      "from helpers import *",
      "def caller():",
      "    alias.deep.work()",
      "    local()",
      "    sibling()",
      "    unknown()",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const caller = symbol(result, "caller", "function", { startLine: 5, endLine: 9 });
    link(result, caller.id, externalNodeId("package.deep", "work"), "calls", { startLine: 6, endLine: 6 });
    link(result, caller.id, externalNodeId("package.tools", "run"), "calls", { startLine: 7, endLine: 7 });
    link(result, caller.id, externalNodeId(".", "sibling"), "calls", { startLine: 8, endLine: 8 });
    link(result, moduleNodeId(files.python), externalNodeId("helpers", "*"), "imports");
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls")).toHaveLength(3);
    expect(result.imports.find(item => item.specifier === "package.deep")?.bindings).toEqual(["package", "work"]);
  });

  it("extracts decorated definitions, identifier bases, self members and explicit exports", async () => {
    const result = await parse("python", [
      "class Base: pass",
      "def factory(): pass",
      "@decorate",
      "class Child(Base, factory()):",
      "    label = 1",
      "    def run(self):",
      "        self.work()",
      "        local = 2",
      "        self.label = 3",
      "    def work(self): pass",
      "@decorate",
      "def wrapped():",
      "    return factory()",
      '__all__ = ["Child", "wrapped", 1, missing]',
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const child = symbol(result, "Child", "class", { startLine: 4, endLine: 10 });
    const run = symbol(result, "run", "method", { startLine: 6, endLine: 9 });
    link(result, child.id, symbol(result, "Base", "class").id, "references", { startLine: 4, endLine: 4 });
    link(result, run.id, symbol(result, "work", "method").id, "calls", { startLine: 7, endLine: 7 });
    link(result, child.id, symbol(result, "label", "const").id, "defines");
    for (const name of ["Child", "wrapped"]) link(result, moduleNodeId(files.python), result.nodes.find(node => node.name === name)!.id, "exports", { startLine: 14, endLine: 14 });
    expect(result.nodes.some(node => node.name === "local")).toBe(false);
    expect(Object.keys(result.exportAliases!).sort()).toEqual(["Child", "wrapped"]);
  });

  it("does not turn dynamic receiver chains, tuple assignments or indirect calls into declarations or concrete targets", async () => {
    const result = await parse("python", [
      "def factory(): pass",
      "def target(): pass",
      "left, right = (1, 2)",
      "def caller():",
      "    self.work()",
      "    factory().work()",
      "    (lambda: 1)()",
      "    (target)()",
      "    local = 1",
      "    2 + 3",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const caller = symbol(result, "caller", "function");
    link(result, caller.id, symbol(result, "factory", "function").id, "calls", { startLine: 6, endLine: 6 });
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls")).toHaveLength(1);
    expect(result.nodes.some(node => ["left", "right", "local"].includes(node.name))).toBe(false);
    const recovery = await parse("python", "class Recovered:\n    def run(self):\n        self.()\n");
    expect(recovery.hasError).toBe(true);
    symbol(recovery, "Recovered", "class");
    expect(recovery.edges.filter(edge => edge.kind === "calls")).toEqual([]);
  });
});

describe("Go real-grammar declaration and receiver coverage", () => {
  it.each(["var", "const"])("extracts every name from a multiple-name %s declaration", async keyword => {
    const result = await parse("go", `package demo\n${keyword} First, second = 1, 2\n`);
    expect(result.hasError).toBe(false);
    expect(result.nodes.filter(node => node.kind === "const").map(node => node.name)).toEqual(["First", "second"]);
    expect(symbol(result, "First", "const", { startLine: 2, endLine: 2 }).exported).toBe(true);
    expect(symbol(result, "second", "const", { startLine: 2, endLine: 2 }).exported).toBeUndefined();
    for (const name of ["First", "second"]) link(result, moduleNodeId(files.go), symbol(result, name, "const").id, "defines");
  });

  it("keeps named bindings after blanks and inside groups without exporting blanks or block locals", async () => {
    const result = await parse("go", [
      "package demo",
      "var (",
      "  First, second = 1, 2",
      ")",
      "const Third, fourth = 3, 4",
      "var _, Fifth = 5, 6",
      "const _, Sixth = 7, 8",
      "func caller() { var localFirst, localSecond = 1, 2 }",
      "",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    expect(result.nodes.filter(node => node.kind === "const").map(node => node.name)).toEqual(["First", "second", "Third", "fourth", "Fifth", "Sixth"]);
    for (const name of ["First", "second"]) symbol(result, name, "const", { startLine: 2, endLine: 4 });
    for (const [name, line] of [["Fifth", 6], ["Sixth", 7]] as const) {
      const node = symbol(result, name, "const", { startLine: line, endLine: line });
      expect(node.exported).toBe(true);
      link(result, moduleNodeId(files.go), node.id, "exports");
    }
    expect(result.nodes.some(node => ["_", "localFirst", "localSecond"].includes(node.name))).toBe(false);
  });

  it("handles grouped type declarations and aliases, value receivers and block-local declarations", async () => {
    const result = await parse("go", [
      "package demo",
      "type (",
      "  Count int",
      "  Shape struct{}",
      "  Contract interface{ Run() }",
      "  Alias = Count",
      ")",
      "var (",
      "  Exported = 1",
      "  hidden Count",
      ")",
      "const (",
      "  Default = 1",
      "  _ = 2",
      ")",
      "func (s Shape) Run() {",
      "  var local Count",
      "  const inner = 1",
      "  Helper()",
      "}",
      "func Helper() {}",
      "",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const shape = symbol(result, "Shape", "class");
    const run = symbol(result, "Run", "method", { startLine: 16, endLine: 20 });
    expect(symbol(result, "Count", "type").exported).toBe(true);
    symbol(result, "Contract", "interface");
    link(result, shape.id, run.id, "defines");
    link(result, run.id, symbol(result, "Count", "type").id, "references", { startLine: 17, endLine: 17 });
    link(result, run.id, symbol(result, "Helper", "function").id, "calls", { startLine: 19, endLine: 19 });
    expect(symbol(result, "Exported", "const").exported).toBe(true);
    expect(symbol(result, "hidden", "const").exported).toBeUndefined();
    expect(result.nodes.some(node => node.name === "_")).toBe(false);
    expect(result.nodes.some(node => ["Alias", "local", "inner"].includes(node.name))).toBe(false);
  });

  it("keeps unresolved receiver forms at module scope without inventing a receiver class", async () => {
    const result = await parse("go", [
      "package demo",
      "type Node struct{}",
      "func (r *Missing) Lost() {}",
      "func (r **Node) Deep() {}",
      "func () Empty() {}",
      "func (r []Node) Slice() {}",
      "func (r ...Node) Variadic() {}",
      "",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    for (const name of ["Lost", "Deep", "Empty", "Slice", "Variadic"]) link(result, moduleNodeId(files.go), symbol(result, name, "method").id, "defines");
    expect(result.nodes.some(node => node.name === "Missing")).toBe(false);
    expect(result.edges.some(edge => edge.kind === "defines" && edge.from === symbol(result, "Node", "class").id)).toBe(false);
  });

  it("binds renamed imports while retaining qualified call boundaries", async () => {
    const result = await parse("go", [
      "package demo",
      'import alias "example.com/pkg"',
      "import (",
      '  . "example.com/dot"',
      '  _ "example.com/side"',
      ")",
      "type Shape struct{}",
      "func helper() {}",
      "func caller() {",
      "  alias.Run()",
      "  unknown.Run()",
      "  Shape.Run()",
      "  factory().Run()",
      "  obj.child.Run()",
      "  (func(){})()",
      "  helper()",
      "}",
      "",
    ].join("\n"));
    expect(result.hasError).toBe(false);
    const caller = symbol(result, "caller", "function");
    link(result, caller.id, externalNodeId("example.com/pkg", "Run"), "calls", { startLine: 10, endLine: 10 });
    link(result, caller.id, symbol(result, "Shape", "class").id, "references", { startLine: 12, endLine: 12 });
    link(result, caller.id, symbol(result, "helper", "function").id, "calls", { startLine: 16, endLine: 16 });
    expect(result.edges.filter(edge => edge.from === caller.id && edge.kind === "calls")).toHaveLength(2);
    expect(result.imports.map(item => item.specifier).sort()).toEqual(["example.com/dot", "example.com/pkg", "example.com/side"]);
  });

  it("recovers subsequent functions and imports after malformed grouped declarations", async () => {
    const result = await parse("go", [
      "package demo",
      "import (",
      "  123",
      '  "fmt"',
      ")",
      "var (123; Lost = 1)",
      "type (123; LostType int)",
      "func Healthy() {}",
      "",
    ].join("\n"));
    expect(result.hasError).toBe(true);
    expect(symbol(result, "Healthy", "function", { startLine: 8, endLine: 8 }).exported).toBe(true);
    link(result, moduleNodeId(files.go), externalNodeId("fmt", "fmt"), "imports", { startLine: 2, endLine: 5 });
    expect(result.nodes.some(node => node.name === "Lost" || node.name === "LostType")).toBe(false);
  });
});
