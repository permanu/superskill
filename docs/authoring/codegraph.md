# Code Knowledge Graph

Deterministic, local-only code graph built with tree-sitter WASM. No LLM, no network, no
native modules. Every edge is tagged `EXTRACTED` (read directly from an AST) or `INFERRED`
(resolved by a rule or a heuristic), so downstream verification can restrict itself to
facts that are true by construction.

Module root: `src/lib/codegraph/`

```
types.ts          data model (nodes, edges, confidence, scan result)
grammars.ts       lazy web-tree-sitter init + per-language grammar loading
store.ts          in-memory graph, JSON (de)serialization, merge with dedup
scan.ts           repo walker + per-file extraction + cross-file resolution
query.ts          findNode / neighbors / importersOf / defsIn / shortestPath (+ EXTRACTED-only)
extractors/       one extractor per language, same Extractor interface
grammars/         vendored grammar wasms (empty) + MANIFEST.json with sha256 pins
__fixtures__/     small multi-language fixtures used by the tests
```

## Quick start

```ts
import { scanRepo, CodeGraphStore, CodeGraphQuery } from "./src/lib/codegraph/index.js";

const { graph, stats } = await scanRepo("src");
const query = new CodeGraphQuery(new CodeGraphStore(graph));

query.findNode("Reporter");                    // by id or by name
query.defsIn("src/lib/codegraph/scan.ts");     // symbols defined in a file
query.importersOf("src/lib/codegraph/types.ts");
query.neighbors(id, { direction: "out", kinds: ["calls"] });
query.shortestPath("Reporter", "normalize");   // BFS over outgoing edges

// verification mode: only EXTRACTED facts
query.neighborsExtracted(id);
query.importersOfExtracted(file);
query.defsInExtracted(file);
query.shortestPathExtracted(a, b);
```

## Data model

Node kinds: `module` (one per file), `class`, `function`, `method`, `interface`, `type`,
`const` (any value binding, including fields/properties), `import-source` (an imported
specifier or binding).

```ts
interface CodeNode {
  id: string;          // "file:<relpath>" | "sym:<relpath>#<name>@<line>" | "ext:<specifier>#<binding>"
  kind: CodeNodeKind;
  name: string;        // symbol name, file basename, or import specifier
  file: string;        // POSIX path relative to the scan root ("" for nothing; external nodes keep the importing file)
  language: LanguageId | "external";
  span: { startLine: number; endLine: number };  // 1-based, inclusive
  exported?: boolean;  // present only when true
}
```

Edge kinds: `defines`, `imports`, `exports`, `references`, `calls`.

```ts
interface CodeEdge {
  from: string;        // node id
  to: string;          // node id
  kind: CodeEdgeKind;
  confidence: "EXTRACTED" | "INFERRED";
  file: string;        // file where the edge was observed
  span: { startLine: number; endLine: number };
}
```

Notes:

- `defines` forms a containment tree: module → top-level symbols, class/impl → members,
  function → nested functions. `defsIn(file)` still returns every symbol in the file.
- `imports` from a module to an `import-source` node is `EXTRACTED` and is emitted once per
  imported binding (`import { a, b }` yields two edges). Resolved module → module import
  edges are `INFERRED` and added by `scan.ts`.
- Edges are deduplicated by `from|to|kind|confidence`; the first observed span wins.
- `scanRepo` sorts files, nodes and edges, so repeated scans of unchanged input are
  byte-identical (covered by `determinism.test.ts`).

## Confidence model

| Edge | Confidence | Why |
|---|---|---|
| `defines` | `EXTRACTED` | lexical containment in the AST |
| `imports` module → `import-source` | `EXTRACTED` | the import statement names the specifier |
| `imports` module → module | `INFERRED` | specifier resolution (path heuristics) |
| `exports` | `EXTRACTED` | export modifier / `__all__` / `pub` / `public` read from the AST |
| `references` | `INFERRED` | identifier use resolved by name (same file, class member, or import binding) |
| `calls` | `INFERRED` | callee resolved by name |

Resolution order for a use (`extractors/common.ts`):

1. enclosing class member with that name (if inside a class),
2. same-file symbol with that name (first declaration in file order),
3. import binding with that local name → edge to `ext:<specifier>#<binding>`,
4. otherwise the use is dropped (no speculative edges).

`scan.ts` then rewires placeholders: for every import that resolves to a repo file, the
`<specifier>#<binding>` placeholders of that file are replaced with edges to the real
symbol, and a module → module `imports` edge is added. Unresolved placeholders stay in the
graph (they are the honest "external dependency" record). Qualified/namespace-style calls
(e.g. Go `util.Normalize`, C++ `ns::fn`, Swift/Java `Obj.member` through a binding) remain
attached to the import source because the member name is not a first-class import binding.

Verification should only use `EXTRACTED` edges: those are exactly the facts the AST states.
All resolution-derived knowledge is `INFERRED` and may be wrong for overloads, shadowing,
name collisions, or unmodeled resolution rules.

## Scan behavior

- Walk: recursive, symlinks skipped, default skip dirs `.git`, `node_modules`, `dist`,
  `build`, `.superskill`, `.venv`, `venv`, `target`, `.next`, `.turbo`, `coverage`,
  `vendor`, `Pods`, `.build` (override with `skipDirs`).
- Extensions: `.ts .mts .cts .tsx .js .mjs .cjs .jsx .py .pyi .go .rs .swift .java .c .h .cpp .cc .cxx .hpp .hh .hxx`.
  JavaScript and JSX use the TypeScript and TSX grammars respectively.
- Options: `maxFileSize` (default 1 MB), `languages` (default all supported).
- Stats: `files`, `nodes`, `edges`, `nodesByKind`, `edgesByKind`, `edgesByConfidence`,
  `parseErrors` (files whose tree contains an `ERROR` node), `filesSkipped`
  (too large / unreadable / grammar unavailable).
- No `tsconfig`, `go.mod`, `Cargo.toml`, package-manager or build-config awareness.

## Cross-file resolution

| Language | Resolves | Stays external |
|---|---|---|
| TypeScript/TSX | `./x` → `x.ts`, `x.tsx`, `x.d.ts`, `x/index.ts`; `.js` specifiers mapped back to TS | package imports, tsconfig path aliases |
| Python | relative `from .x import`; absolute modules by path or basename | site-packages, dynamic imports |
| Go | last import path segment → directory with `.go` files (shortest match) | stdlib, module-path prefixes |
| Rust | `crate::` (nearest `lib.rs`/`main.rs` ancestor), `self::`, `super::` | external crates |
| Java | `<ClassName>.java` by basename anywhere under the root | JDK/platform types, wildcard-only packages |
| C/C++ | quoted includes relative to the file, then by basename | system includes (`<...>`, kept verbatim) |
| Swift | nothing (modules are not files) | everything |

## Per-language limitations

All languages: name-based resolution means overloads/duplicate names resolve to the first
match; macros and generated code are invisible; no control-flow or type analysis.

**TypeScript / TSX** — classes, interfaces, type aliases, enums (as `type`), functions,
methods, top-level/class-level `const`/`let`/`var` (local variables are skipped), arrow
functions assigned to top-level namespaces (`namespace` → `class` container). Exports come
from `export`/`export {}`/`export default`; `export * from` and `export ... from` are
recorded as imports. Default imports create an `ext:<spec>#default` binding that resolves to
the module but not to a specific symbol. Calls cover identifiers, `this.x`, `obj.x`;
member calls on arbitrary expressions are not resolved. References cover type identifiers
and heritage clauses; generic identifier uses are intentionally not emitted.

**Python** — classes, methods, functions (decorated definitions unwrapped, `async` treated
like `def`), module/class-level assignments (as `const`), `import`, `from ... import`
(relative and absolute), aliases and `*`. Exports are emitted only for names listed in
`__all__`; there is no implicit public API. Calls cover bare names, `self.x`, and attribute
chains rooted at a simple identifier. References are limited to base classes. No type
annotations, decorators, or dynamic imports.

**Go** — structs (as `class`), interfaces, type aliases, functions, methods, package-level
`const`/`var` (locals skipped). Methods attach to the receiver type when that type is
declared in the same file; otherwise they attach to the module. `exported` is the Go
capitalization rule. `pkg.Func` calls point at the import source; calls to `receiver.method`
resolve only if a unique same-file symbol matches the method name.

**Rust** — structs (as `class`), enums (as `type`), traits (as `interface`), type aliases,
modules (as `class` containers), consts/statics, free functions and impl/trait methods.
`impl` blocks attach methods to the type when it is declared in the same file. `use` paths
(scoped, lists, aliases, wildcards) are recorded; `crate::`/`self::`/`super::` resolve.
Macro bodies and `#[cfg]` are not evaluated.

**Swift** — the grammar represents `class`, `struct`, `enum` and `extension` all as
`class_declaration`, so all four map to `class`; protocols map to `interface`; `init` and
`deinit` map to `method`; `let`/`var` (including properties and enum entries) map to `const`;
`typealias` maps to `type`. Only `public`/`open` counts as exported. Imports are module
names and never resolve to files. Calls cover bare names, `self.x` and `receiver.x`.

**Java** — classes and records (as `class`), interfaces, enums (as `type`), methods,
constructors, fields and enum constants (as `const`). Class imports bind the class name;
static member imports bind the member name; wildcard imports bind `*`. Qualified calls
through an imported class resolve to the class symbol, not the method. Same-package types
without an import are not linked.

**C** — structs/unions (as `class`), enums, typedefs (as `type`, or `class` for anonymous
structs), function definitions and prototypes, top-level initialized declarations (as
`const`). System includes keep `<...>` in the specifier and never resolve. Calls only cover
plain identifiers; function pointers and member calls are unresolved. No export concept.

**C++** — as C plus namespaces (as `class` containers), classes/structs with methods
(inline definitions and in-class declarations), fields (as `const`), out-of-line
`ns::fn` definitions (name only, qualifier dropped), qualified and `obj.member` calls.
Base classes are references. Templates are not instantiated or expanded.

## Grammar sourcing and pinning

The graph uses [`tree-sitter-wasms@0.1.13`](https://github.com/Gregoor/tree-sitter-wasms)
(prebuilt grammar wasms, Unlicense) and
[`web-tree-sitter@0.24.7`](https://github.com/tree-sitter/tree-sitter) (MIT). Both are pinned
exactly in `package.json`.

**Why not web-tree-sitter 0.27:** the wasms shipped in tree-sitter-wasms 0.1.13 use the
legacy Emscripten `dylink` format; web-tree-sitter ≥ 0.25 refuses to load them
(`getDylinkMetadata` failure). The last release that loads them is 0.24.x, so the module
pins 0.24.7. Upgrade path if a newer runtime is needed: vendor grammars built with
tree-sitter CLI ≥ 0.26 (the official release pages publish `.wasm` assets for most of these
grammars) into `src/lib/codegraph/grammars/`, update `MANIFEST.json` with version + sha256,
and bump `web-tree-sitter`; vendored files take precedence over the package at runtime.

`grammars/MANIFEST.json` records the package, version, license and sha256 of every wasm the
module depends on. Verify a checkout with:

```sh
shasum -a 256 node_modules/tree-sitter-wasms/out/*.wasm
```

Grammar builds used by 0.1.13 (from the package's build metadata): typescript 0.20.5,
tsx 0.20.5, python 0.21.0, go 0.20.0, rust 0.20.4, swift 0.4.0, java 0.20.2, c 0.20.7,
cpp 0.20.4. Node-type names in the extractors correspond to these grammar versions.

`grammars.ts` exposes `supportedFor(lang)` — `{ supported, wasm, source, extensions, reason }`
— and `loadLanguage(lang)` throws a clear error naming both lookup paths when a wasm is
missing. A language that cannot be supported is reported as `supported: false` with the
reason; extraction is never faked.

## Adding a grammar

1. Add the id to `LanguageId` / `LANGUAGES` in `types.ts`.
2. Add the wasm filename to `GRAMMAR_FILES` and the extension mapping to `EXTENSION_MAP`
   in `grammars.ts`; put the wasm in `grammars/` (vendored) or rely on tree-sitter-wasms.
3. Write `extractors/<language>.ts` exporting an `Extractor`
   (`(input: ExtractInput) => ExtractResult`) and register it in `extractors/index.ts`.
4. If imports should resolve to files, add a branch to `resolveSpecifier` in `scan.ts`.
5. Add a fixture under `__fixtures__/<language>/`, an extractor test (defs, imports,
   confidence tags), and a scan case in `scan.test.ts` when cross-file resolution exists.
6. Record the wasm sha256 in `grammars/MANIFEST.json`; run `npx tsc --noEmit` and
   `npx vitest run src/lib/codegraph`.

## Measured on this repository

`scanRepo("src")` with all languages, at the time of writing:

- 217 files scanned, 0 parse errors, ~0.8 s, 2038 nodes, 7518 edges.
- Nodes: module 217, function 581, method 133, const 234, interface 182, type 44, class 25,
  import-source 622.
- Edges: calls 2281, imports 2409, defines 1199, references 1082, exports 547.
- Confidence: EXTRACTED 3630, INFERRED 3888.

Counts include the test fixtures under `src/lib/codegraph/__fixtures__/`.
