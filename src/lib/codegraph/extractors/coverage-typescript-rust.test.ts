import { describe, expect, it } from "vitest";
import { getParser, loadLanguage } from "../grammars.js";
import type { CodeEdgeKind, CodeNode, CodeNodeKind, Confidence, ExtractResult } from "../types.js";
import { externalNodeId, moduleNodeId } from "./common.js";
import { extractorFor } from "./index.js";

type TestLanguage = "typescript" | "rust" | "cpp";

const FILES: Record<TestLanguage, string> = {
  typescript: "coverage-extractors.ts",
  rust: "coverage-extractors.rs",
  cpp: "coverage-extractors.cpp",
};

async function extract(language: TestLanguage, source: string, malformed = false): Promise<ExtractResult> {
  const parser = await getParser();
  parser.setLanguage(await loadLanguage(language));
  parser.reset();
  const tree = parser.parse(source);
  try {
    expect(tree.rootNode.hasError).toBe(malformed);
    const result = extractorFor(language)({ file: FILES[language], source, tree, language });
    expect(result.nodes[0]).toMatchObject({ id: moduleNodeId(FILES[language]), kind: "module", file: FILES[language], language });
    expect(result.nodes.every((node) => node.span.startLine > 0 && node.span.endLine >= node.span.startLine)).toBe(true);
    expect(result.edges.every((edge) => edge.file === FILES[language])).toBe(true);
    return result;
  } finally {
    tree.delete();
    parser.reset();
  }
}

function symbol(result: ExtractResult, name: string, kind?: CodeNodeKind): CodeNode {
  const node = result.nodes.find((entry) => entry.name === name && (kind === undefined || entry.kind === kind));
  expect(node, `${kind ?? "symbol"} ${name}`).toBeDefined();
  return node!;
}

function edge(result: ExtractResult, from: string, to: string, kind: CodeEdgeKind, confidence: Confidence): void {
  expect(result.edges).toContainEqual(expect.objectContaining({ from, to, kind, confidence }));
}

describe("TypeScript AST extraction variants", () => {
  it("records enums, interfaces, type aliases and inheritance without promoting references to facts", async () => {
    const result = await extract("typescript", `
class Parent {}
interface Contract { ready(): void; }
export enum Mode { Quiet, Loud }
export type Alias = Parent;
export interface PublicContract extends Contract { value: Alias; }
export class Child extends Parent implements Contract { ready() {} }
`);
    const module = moduleNodeId(FILES.typescript);
    for (const [name, kind] of [["Mode", "type"], ["Alias", "type"], ["PublicContract", "interface"], ["Child", "class"]] as const) {
      const node = symbol(result, name, kind);
      expect(node.exported).toBe(true);
      edge(result, module, node.id, "exports", "EXTRACTED");
    }
    const child = symbol(result, "Child");
    edge(result, child.id, symbol(result, "Parent").id, "references", "INFERRED");
    edge(result, child.id, symbol(result, "Contract").id, "references", "INFERRED");
    expect(symbol(result, "Parent").exported).toBeUndefined();
  });

  it("owns namespace declarations and distinguishes callable initializers from constants and local bindings", async () => {
    const result = await extract("typescript", `
function helper() {}
export namespace API {
  export const version = 1;
  export function run() { let privateValue = helper(); }
}
const arrow = () => helper();
const expression = function() { return helper(); };
var uninitialized: number;
const { destructured } = { destructured: helper() };
const [first] = [helper()];
function* generator() { const privateGenerator = helper(); }
`);
    const namespace = symbol(result, "API", "class");
    for (const name of ["version", "run"]) {
      edge(result, namespace.id, symbol(result, name).id, "defines", "EXTRACTED");
      expect(symbol(result, name).exported).toBe(true);
    }
    for (const name of ["arrow", "expression"]) {
      edge(result, moduleNodeId(FILES.typescript), symbol(result, name).id, "defines", "EXTRACTED");
      edge(result, symbol(result, name).id, symbol(result, "helper").id, "calls", "INFERRED");
    }
    expect(symbol(result, "arrow").kind).toBe("function");
    expect(symbol(result, "uninitialized", "const").exported).toBeUndefined();
    for (const name of ["privateValue", "privateGenerator", "destructured", "first"]) {
      expect(result.nodes.some((node) => node.name === name)).toBe(false);
    }
  });

  it("handles named, computed, private and string fields while resolving this calls only as inferred", async () => {
    const result = await extract("typescript", `
function helper() {}
const key = "computed";
class Box {
  public plain = helper();
  #secret = helper();
  [key] = helper();
  "quoted" = helper();
  ready() { return helper(); }
  run() { const privateRun = helper(); this.ready(); this.missing(); }
}
function loose() { this.missing(); }
`);
    const box = symbol(result, "Box");
    for (const [name, kind] of [["plain", "const"], ["ready", "method"], ["run", "method"]] as const) {
      edge(result, box.id, symbol(result, name, kind).id, "defines", "EXTRACTED");
    }
    edge(result, symbol(result, "run").id, symbol(result, "ready").id, "calls", "INFERRED");
    edge(result, symbol(result, "plain").id, symbol(result, "helper").id, "calls", "INFERRED");
    expect(result.nodes.some((node) => ["#secret", "quoted", "[key]", "privateRun", "missing"].includes(node.name))).toBe(false);
    expect(result.edges.some((entry) => entry.kind === "calls" && entry.confidence === "EXTRACTED")).toBe(false);
  });

  it("retains default, aliased, namespace, type-only and side-effect import identities", async () => {
    const result = await extract("typescript", `
import "./effects";
import main, { value, build as create, type Shape } from "./model";
import * as space from "./namespace";
import type { Type as Alias } from "./types";
import {} from "./empty";
import defaultOnly from "./default";
function invoke(input: Alias) { main(create(value)); space.work(); space.work(); defaultOnly(); }
`);
    const module = moduleNodeId(FILES.typescript);
    const invoke = symbol(result, "invoke");
    for (const [specifier, bindings] of [
      ["./effects", ["*"]], ["./model", ["default", "value", "build", "Shape"]],
      ["./namespace", ["*", "work"]], ["./types", ["Type"]], ["./default", ["default"]],
    ] as Array<[string, string[]]>) {
      expect(result.imports.find((entry) => entry.specifier === specifier)?.bindings).toEqual(bindings);
      const external = symbol(result, specifier, "import-source");
      expect(external.language).toBe("external");
      edge(result, module, externalNodeId(specifier, bindings[0]), "imports", "EXTRACTED");
    }
    for (const [specifier, binding] of [["./model", "default"], ["./model", "build"], ["./namespace", "work"], ["./default", "default"]]) {
      edge(result, invoke.id, externalNodeId(specifier, binding), "calls", "INFERRED");
    }
    edge(result, invoke.id, externalNodeId("./types", "Type"), "references", "INFERRED");
    expect(result.edges.filter((entry) => entry.to === externalNodeId("./namespace", "work") && entry.kind === "calls")).toHaveLength(1);
    expect(result.imports.some((entry) => entry.specifier === "./empty")).toBe(false);
  });

  it.each([
    ["function selected() {}", "function"],
    ["class Selected { method() {} }", "class"],
  ] as const)("connects named default %s declarations to their local symbol", async (declaration, kind) => {
    const result = await extract("typescript", `export default ${declaration}`);
    const name = kind === "function" ? "selected" : "Selected";
    const target = symbol(result, name, kind);
    expect(result.exportAliases?.default).toBe(target.id);
    edge(result, moduleNodeId(FILES.typescript), target.id, "exports", "EXTRACTED");
    expect(target.exported).toBe(true);
  });

  it("connects local export aliases and default identifiers without inventing missing symbols", async () => {
    const result = await extract("typescript", `
const hidden = 1;
export { hidden, hidden as visible, ghost };
export default hidden;
export {};
`);
    const hidden = symbol(result, "hidden");
    expect(result.exportAliases).toMatchObject({ hidden: hidden.id, visible: hidden.id, default: hidden.id });
    expect(result.exportAliases).not.toHaveProperty("ghost");
    expect(result.nodes.some((node) => node.name === "visible" || node.name === "ghost")).toBe(false);
    expect(result.edges.filter((entry) => entry.kind === "exports")).toEqual([
      expect.objectContaining({ from: moduleNodeId(FILES.typescript), to: hidden.id, confidence: "EXTRACTED" }),
    ]);
  });

  it("records named, star and namespace re-exports as import statements rather than resolved local exports", async () => {
    const result = await extract("typescript", `
export { remote, default as chosen } from "./named";
export * from "./star";
export * as bundle from "./namespace";
`);
    expect(result.imports.map(({ specifier, bindings }) => ({ specifier, bindings }))).toEqual([
      { specifier: "./named", bindings: ["remote", "default"] },
      { specifier: "./star", bindings: ["*"] },
      { specifier: "./namespace", bindings: ["*"] },
    ]);
    for (const entry of result.imports) {
      edge(result, moduleNodeId(FILES.typescript), externalNodeId(entry.specifier, entry.bindings[0]), "imports", "EXTRACTED");
    }
    expect(result.edges.some((entry) => entry.kind === "exports")).toBe(false);
    expect(Object.keys(result.exportAliases ?? {})).toEqual([]);
  });

  it("keeps optional, computed and indirect calls conservative while recognizing constructors and local qualifiers", async () => {
    const result = await extract("typescript", `
function helper() {}
class Service { work() {} }
function invoke(object: any) {
  helper?.();
  new Service();
  Service.work();
  object?.unresolved();
  object["unresolved"]();
  (object.child).unresolved();
  (helper)();
  (() => helper())();
  import("./dynamic");
}
`);
    const invoke = symbol(result, "invoke");
    const service = symbol(result, "Service");
    edge(result, invoke.id, service.id, "calls", "INFERRED");
    edge(result, invoke.id, service.id, "references", "INFERRED");
    edge(result, invoke.id, symbol(result, "helper").id, "calls", "INFERRED");
    expect(result.imports).toEqual([]);
    expect(result.edges.some((entry) => entry.from === invoke.id && entry.to === symbol(result, "work").id)).toBe(false);
    expect(result.edges.filter((entry) => entry.kind === "calls").every((entry) => entry.confidence === "INFERRED")).toBe(true);
  });

  it.each(["function () {}", "class { method() {} }", "42"])("does not fabricate a named export for anonymous default value %s", async (value) => {
    const result = await extract("typescript", `export default ${value}`);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toEqual([]);
    expect(Object.keys(result.exportAliases ?? {})).toEqual([]);
  });

  it("recovers a complete trailing export after malformed unnamed declarations", async () => {
    const result = await extract("typescript", `function () {}\nclass {}\ninterface {}\ntype = number;\nenum {}\nnamespace {}\nexport const recovered = 1;`, true);
    const recovered = symbol(result, "recovered", "const");
    expect(recovered.span).toEqual({ startLine: 7, endLine: 7 });
    expect(result.nodes.filter((node) => node.kind !== "module")).toEqual([recovered]);
    edge(result, moduleNodeId(FILES.typescript), recovered.id, "exports", "EXTRACTED");
  });
});

describe("Rust AST extraction variants", () => {
  it("collects nested modules, enums, traits, aliases and static items with their actual owners and visibility", async () => {
    const result = await extract("rust", `
pub mod api {
  pub struct Worker;
  pub enum Mode { Quiet, Loud }
  pub trait Render { fn render(&self); }
  pub type Alias = Worker;
  pub const LIMIT: usize = 1;
  static INTERNAL: usize = 0;
  pub fn run() {}
}
mod external;
type Local = u8;
pub static SHARED: usize = 2;
`);
    const module = moduleNodeId(FILES.rust);
    const api = symbol(result, "api", "class");
    for (const [name, kind] of [["Worker", "class"], ["Mode", "type"], ["Render", "interface"], ["Alias", "type"], ["LIMIT", "const"], ["run", "function"]] as const) {
      const node = symbol(result, name, kind);
      edge(result, api.id, node.id, "defines", "EXTRACTED");
      edge(result, module, node.id, "exports", "EXTRACTED");
      expect(node.exported).toBe(true);
    }
    edge(result, symbol(result, "Render").id, symbol(result, "render", "method").id, "defines", "EXTRACTED");
    expect(symbol(result, "INTERNAL").exported).toBeUndefined();
    expect(symbol(result, "external", "class").exported).toBeUndefined();
    expect(symbol(result, "Local", "type").exported).toBeUndefined();
    expect(symbol(result, "SHARED", "const").exported).toBe(true);
  });

  it("attaches known impls to their class and leaves unresolved impl types under the module", async () => {
    const result = await extract("rust", `
struct Worker;
trait Render { fn render(&self); }
fn helper() {}
impl Render for Worker {
  fn render(&self) { helper(); }
}
impl Worker {
  pub fn run(&self) { self.render(); helper(); }
}
impl Missing {
  fn orphan() { helper(); }
}
`);
    const worker = symbol(result, "Worker");
    const run = symbol(result, "run", "method");
    const render = result.nodes.find((node) => node.name === "render" && node.span.startLine === 6)!;
    expect(render).toBeDefined();
    edge(result, worker.id, run.id, "defines", "EXTRACTED");
    edge(result, worker.id, render.id, "defines", "EXTRACTED");
    edge(result, worker.id, symbol(result, "Render").id, "references", "INFERRED");
    edge(result, run.id, render.id, "calls", "INFERRED");
    edge(result, run.id, symbol(result, "helper").id, "calls", "INFERRED");
    edge(result, moduleNodeId(FILES.rust), symbol(result, "orphan", "function").id, "defines", "EXTRACTED");
    expect(result.nodes.some((node) => node.name === "Missing")).toBe(false);
  });

  it("preserves single, aliased, wildcard and scoped-list import bindings", async () => {
    const result = await extract("rust", `
use std;
use alloc as memory;
use crate::helpers::direct as local;
use crate::helpers::{run, format as render, nested::find};
use crate::helpers::*;
fn invoke() { local(); render(); run(); find(); memory::drop(); }
`);
    expect(result.imports.map(({ specifier, bindings }) => ({ specifier, bindings }))).toEqual([
      { specifier: "std", bindings: ["std"] },
      { specifier: "alloc", bindings: ["alloc"] },
      { specifier: "crate::helpers", bindings: ["direct", "run", "format", "*"] },
      { specifier: "nested", bindings: ["find"] },
    ]);
    const invoke = symbol(result, "invoke");
    for (const [specifier, binding] of [["crate::helpers", "direct"], ["crate::helpers", "format"], ["crate::helpers", "run"], ["nested", "find"], ["alloc", "alloc"]]) {
      edge(result, invoke.id, externalNodeId(specifier, binding), "calls", "INFERRED");
      edge(result, moduleNodeId(FILES.rust), externalNodeId(specifier, binding), "imports", "EXTRACTED");
    }
    expect(result.nodes.some((node) => node.name === "local" || node.name === "render")).toBe(false);
  });

  it("does not invent bindings for unsupported nested use lists or wildcard items inside lists", async () => {
    const result = await extract("rust", `
use {std::fmt, std::mem};
use crate::helpers::{*, nested::{deep}, available};
fn invoke() { deep(); available(); }
`);
    expect(result.imports.map(({ specifier, bindings }) => ({ specifier, bindings }))).toEqual([
      { specifier: "crate::helpers", bindings: ["available"] },
    ]);
    edge(result, symbol(result, "invoke").id, externalNodeId("crate::helpers", "available"), "calls", "INFERRED");
    expect(result.nodes.some((node) => node.name.includes("deep") || node.name === "std::fmt")).toBe(false);
    expect(result.edges.some((entry) => entry.kind === "calls" && entry.confidence === "EXTRACTED")).toBe(false);
  });

  it("keeps scoped calls heuristic and ignores block-local constants and unresolved receiver values", async () => {
    const result = await extract("rust", `
use crate::helpers as imported;
struct Worker;
const GLOBAL: usize = 1;
static SHARED: usize = 2;
fn helper() {}
fn invoke(value: Worker) {
  const LOCAL: usize = 0;
  static HIDDEN: usize = 0;
  imported::work();
  Worker::construct();
  value.work();
  (value).work();
  (helper)();
  helper();
}
`);
    const invoke = symbol(result, "invoke");
    edge(result, invoke.id, externalNodeId("crate", "helpers"), "calls", "INFERRED");
    edge(result, invoke.id, symbol(result, "Worker").id, "references", "INFERRED");
    edge(result, invoke.id, symbol(result, "helper").id, "calls", "INFERRED");
    expect(symbol(result, "GLOBAL", "const")).toBeDefined();
    expect(symbol(result, "SHARED", "const")).toBeDefined();
    expect(result.nodes.some((node) => ["LOCAL", "HIDDEN", "work", "construct"].includes(node.name))).toBe(false);
  });

  it("does not synthesize module-level type definitions for function-local items", async () => {
    const result = await extract("rust", `
fn parent() {
  struct Nested;
  enum LocalMode { A }
  type LocalAlias = u8;
  trait LocalTrait { fn required(); }
  impl Nested { fn nested_function() {} }
  mod hidden { pub fn child() {} }
}
`);
    const parent = symbol(result, "parent", "function");
    for (const name of ["Nested", "LocalMode", "LocalAlias", "LocalTrait", "hidden"]) {
      expect(result.nodes.some((node) => node.name === name)).toBe(false);
    }
    edge(result, parent.id, symbol(result, "required", "method").id, "defines", "EXTRACTED");
    edge(result, parent.id, symbol(result, "nested_function", "function").id, "defines", "EXTRACTED");
    edge(result, parent.id, symbol(result, "child", "function").id, "defines", "EXTRACTED");
  });

  it("recovers complete declarations between invalid imports and an unfinished function", async () => {
    const result = await extract("rust", "use ;\npub fn recovered() {}\nfn unfinished(", true);
    const recovered = symbol(result, "recovered", "function");
    expect(recovered.span).toEqual({ startLine: 2, endLine: 2 });
    expect(recovered.exported).toBe(true);
    edge(result, moduleNodeId(FILES.rust), recovered.id, "exports", "EXTRACTED");
    expect(result.imports.every((entry) => entry.specifier.length > 0)).toBe(true);
    expect(result.edges.some((entry) => entry.kind === "calls")).toBe(false);
  });
});

describe("C++ AST extraction variants", () => {
  it("records class, struct and union definitions, bases, fields and declared methods", async () => {
    const result = await extract("cpp", `
struct Base { int value; };
union Packed { int count; float ratio; };
class Forward;
class Derived : public Base {
  int initialized = 1;
  int braced{2};
  int array[2];
  void declared();
  void run() {}
};
`);
    const derived = symbol(result, "Derived", "class");
    edge(result, derived.id, symbol(result, "Base", "class").id, "references", "INFERRED");
    for (const name of ["initialized", "braced", "declared", "run"]) {
      edge(result, derived.id, symbol(result, name).id, "defines", "EXTRACTED");
    }
    for (const name of ["count", "ratio"]) {
      edge(result, symbol(result, "Packed", "class").id, symbol(result, name, "const").id, "defines", "EXTRACTED");
    }
    expect(result.nodes.some((node) => node.name === "Forward" || node.name === "array")).toBe(false);
    expect(result.nodes.every((node) => node.exported !== true)).toBe(true);
  });

  it("distinguishes named enums from anonymous and forward declarations", async () => {
    const result = await extract("cpp", `
enum Status { Ready, Failed };
enum class Mode : unsigned { Quiet, Loud };
enum Unknown;
enum Status;
enum { Anonymous = 1 };
struct { int anonymous_field; } instance;
`);
    for (const name of ["Status", "Mode"]) {
      edge(result, moduleNodeId(FILES.cpp), symbol(result, name, "type").id, "defines", "EXTRACTED");
    }
    edge(result, moduleNodeId(FILES.cpp), symbol(result, "Status").id, "references", "INFERRED");
    expect(result.nodes.some((node) => ["Unknown", "Anonymous", "instance"].includes(node.name))).toBe(false);
    expect(symbol(result, "anonymous_field", "const")).toBeDefined();
  });

  it("walks anonymous namespaces and template declarations without inventing anonymous owners", async () => {
    const result = await extract("cpp", `
namespace { int private_function() { return 1; } }
namespace API {
  template <typename T> T identity(T input) { return input; }
  template <typename T> class Holder {
    T field;
    T convert(T input) { return identity(input); }
  };
}
`);
    const module = moduleNodeId(FILES.cpp);
    edge(result, module, symbol(result, "private_function", "function").id, "defines", "EXTRACTED");
    const namespace = symbol(result, "API", "class");
    edge(result, namespace.id, symbol(result, "identity", "function").id, "defines", "EXTRACTED");
    edge(result, namespace.id, symbol(result, "Holder", "class").id, "defines", "EXTRACTED");
    edge(result, symbol(result, "Holder").id, symbol(result, "convert", "method").id, "defines", "EXTRACTED");
    edge(result, symbol(result, "convert").id, symbol(result, "identity").id, "calls", "INFERRED");
    expect(result.nodes.some((node) => node.kind === "class" && node.name === "")).toBe(false);
  });

  it("records prototypes and initialized globals but does not elevate locals or pointer declarators", async () => {
    const result = await extract("cpp", `
int helper();
int count = 1;
int *pointer = nullptr;
void invoke() {
  int local = helper();
  int nested_declaration();
}
`);
    const module = moduleNodeId(FILES.cpp);
    edge(result, module, symbol(result, "helper", "function").id, "defines", "EXTRACTED");
    edge(result, module, symbol(result, "count", "const").id, "defines", "EXTRACTED");
    edge(result, symbol(result, "invoke").id, symbol(result, "helper").id, "calls", "INFERRED");
    expect(result.nodes.some((node) => node.name === "local" || node.name === "pointer")).toBe(false);
    expect(symbol(result, "nested_declaration", "function")).toBeDefined();
  });

  it("records quoted, system and macro include facts without claiming file resolution", async () => {
    const result = await extract("cpp", "#include \"local.hpp\"\n#include <vector>\n#include HEADER\nint recovered = 1;\n");
    expect(result.imports.map((entry) => entry.specifier)).toEqual(["local.hpp", "<vector>", "HEADER"]);
    for (const entry of result.imports) {
      expect(entry.bindings).toEqual(["*"]);
      edge(result, moduleNodeId(FILES.cpp), externalNodeId(entry.specifier, "*"), "imports", "EXTRACTED");
    }
    expect(result.edges.filter((entry) => entry.kind === "imports").every((entry) => entry.to.startsWith("ext:"))).toBe(true);
    expect(symbol(result, "recovered", "const")).toBeDefined();
  });

  it("handles global and scoped callees, constructors, destructors and unsupported receiver expressions conservatively", async () => {
    const result = await extract("cpp", `
void helper() {}
class Worker {
  Worker() {}
  ~Worker() {}
  void ready() {}
  void run() { this->ready(); }
};
void invoke(Worker value) {
  ::helper();
  unknown::helper();
  value.ready();
  factory().ready();
  (*callback)();
}
`);
    const worker = symbol(result, "Worker", "class");
    edge(result, worker.id, symbol(result, "Worker", "method").id, "defines", "EXTRACTED");
    edge(result, worker.id, symbol(result, "~Worker", "method").id, "defines", "EXTRACTED");
    edge(result, symbol(result, "invoke").id, symbol(result, "helper").id, "calls", "INFERRED");
    expect(result.edges.some((entry) => entry.kind === "calls" && entry.confidence === "EXTRACTED")).toBe(false);
    expect(result.nodes.some((node) => ["factory", "callback", "unknown"].includes(node.name))).toBe(false);
  });

  it("keeps intact declarations after malformed initializers and unfinished structs", async () => {
    const result = await extract("cpp", "int broken = ;\nint recovered() { return 1; }\nstruct {", true);
    const recovered = symbol(result, "recovered", "function");
    expect(recovered.span).toEqual({ startLine: 2, endLine: 2 });
    edge(result, moduleNodeId(FILES.cpp), recovered.id, "defines", "EXTRACTED");
    expect(result.nodes.some((node) => node.kind === "class" && node.name === "")).toBe(false);
    expect(result.edges.some((entry) => entry.confidence === "EXTRACTED" && entry.kind === "calls")).toBe(false);
  });
});
