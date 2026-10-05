# Verification Report - TypeScript Batch 5 (`mod`, `lint`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `mod-*.md` + 12 `lint-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1; TypeScript 5.9.3 (`node /Users/arvee/Documents/superskill/node_modules/typescript/bin/tsc`)
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/b5` (fetched pages, snippets, tsc outputs, Node probes)

## Method

1. Fetched every distinct cited URL (24 total: Node esm/packages/modules/typescript docs, MDN `import()`, TSConfig `erasableSyntaxOnly`/`verbatimModuleSyntax`/`isolatedModules`, Google TypeScript Style Guide, and 12 typescript-eslint rule pages). All returned HTTP 200 and were read for the claim-specific passages quoted below.
2. Extracted both fenced snippets from all 24 rules (48) and compiled each with the exact harness command through the repo validator (`dist/rules/validate.js`): 48/48 clean, zero diagnostics.
3. Ran targeted enforcement probes: `--erasableSyntaxOnly` (TS1294), `--verbatimModuleSyntax` (TS1484), `--isolatedModules` (TS1205), ESM nodenext extension rule (TS2835), `--noUnusedLocals` (TS6133), declaration emit for literal widening, and a resolved-module compile (with `@types/node` visible) of the two `node:fs` snippets.
4. Ran bounded Node v26.8.1 behavior probes: JSON import attribute (`ERR_IMPORT_ATTRIBUTE_MISSING`), subpath imports map, `exports` encapsulation (`ERR_PACKAGE_PATH_NOT_EXPORTED`), static vs dynamic import evaluation timing, `import.meta.url` from a foreign cwd, `require(esm)`, bare `require` in ESM, and `||` vs `??`.
5. Mechanical checks: frontmatter/id/prefix via the validator, summary word counts, section/fence rules, `related` and See Also resolution, version-number scan, near-duplicate scan (Jaccard >= 0.45 across the pack, none hit).
6. Repo deterministic validator (read-only): `node dist/rules/cli.js validate --lang typescript --no-compile` -> 1 error, in `style-array-type.md` (non-batch, pre-existing); all 24 batch files clean.

## `@ts-expect-error` convention assessment (task note)

- All `mod-*` imports carry `// @ts-expect-error: <reason>`, matching the reason-bearing convention of the verified `type-no-ts-ignore` Good.
- It reads correctly for genuinely project-relative or third-party modules: the reason states that resolution is deferred to Node at runtime, which is exactly why the isolated harness cannot resolve the import.
- Two wording imprecisions, noted but not blocking: Bad snippets whose load intentionally fails (`mod-import-attributes`, `mod-file-extensions`) can read as "resolves fine at runtime"; `mod-type-only-imports` Good says a type-only import is "resolved at runtime by Node" although it is erased and never resolved.
- Blocking in two files: for Node builtins the import resolves in any real project, so the directive masked real API errors (`readFile(path)` -> TS2554/TS2322). Those rules are rejected below.

## Source evidence (claim-specific)

- `mod-import-attributes`: Node esm.html - "The `type: 'json'` attribute is mandatory when importing JSON modules" and the dynamic form `import('./bar.json', { with: { type: 'json' } })`; MDN `import()` documents the `with` options parameter. Probe: `ERR_IMPORT_ATTRIBUTE_MISSING` without the attribute, `1` with it.
- `mod-subpath-imports`: Node packages.html - "Entries in the `imports` field must always start with `#`"; "private mappings that only apply to import specifiers from within the package itself". Probe: `#lib/format.js` resolves through the map.
- `mod-erasable-syntax`: TS `erasableSyntaxOnly` page lists enum declarations, namespaces with runtime code, parameter properties, and `import =`/`export =`; Node typescript.html lists the same constructs (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX) and "replace TypeScript syntax with whitespace". Probe: TS1294 on the Bad enum, Good clean.
- `mod-type-only-imports`: Node typescript.html - "Without the type keyword, Node.js will treat the import as a value import, which will result in a runtime error"; `verbatimModuleSyntax` page - "Anything that uses the type modifier is dropped entirely"; `consistent-type-imports` page exists. Probe: TS1484 under `verbatimModuleSyntax`, Good clean.
- `mod-lazy-dynamic-import`: MDN - "dynamic imports are only evaluated when needed"; return value "a promise which ... fulfills to a module namespace object". Probe: static module evaluated at load; dynamic only when called.
- `mod-type-only-exports`: `isolatedModules` page "Exports of Non-Value Identifiers" - "Single-file transpilers don't know whether `someType` produces a value or not, so it's an error to export a name that only refers to a type"; `consistent-type-exports` page exists. Probe: TS1205 on the Bad export, Good clean.
- `mod-import-meta-locate`: Node esm.html - `import.meta.url` is "The absolute `file:` URL of the module ... This enables useful patterns such as relative file loading". Probe: URL resolves next to the module when run from `cwd=/`.
- `mod-file-extensions`: Node esm.html - "A file extension must be provided when using the `import` keyword to resolve relative or absolute specifiers"; Node typescript.html - "file extensions are mandatory in import statements and `import()` expressions". Probe: TS2835 on the Bad form in an ESM package, Good clean. Tool id `tsc:moduleResolution` accepted: consistent with the pack's `tsc:<option>` convention and named by the diagnostic itself.
- `mod-public-entry`: Node packages.html - "When the `exports` field is defined, all subpaths of the package are encapsulated and no longer available to importers ... `ERR_PACKAGE_PATH_NOT_EXPORTED`". Probe confirmed deep import fails, entry import succeeds.
- `mod-namespace-imports`: Google TypeScript Style Guide - "Prefer named imports for symbols used frequently in a file or for symbols that have clear names ... Prefer namespace imports when using many different symbols from large APIs."
- `mod-no-require` [REJECTED]: typescript-eslint `no-require-imports` exists ("Disallow invocation of `require()`"; its Incorrect examples include `import foo = require('foo')`) and Node typescript.html supports "Node.js will not convert from one module system to another" and the ESM runtime error (probe: `ReferenceError: require is not defined in ES module scope`). But the Why's "they cannot load ESM-only packages" is unsupported by the cited pages and false on the baseline: Node modules.html "Loading ECMAScript modules using `require()`" is no longer experimental (v25.4.0) and a Node v26.8.1 probe required an ESM-only package successfully (`require(esm) => 42`). The Good snippet additionally calls `readFile(path)` with one argument, which fails against `@types/node` (see rejects).
- `mod-node-builtin-prefix` [REJECTED]: Node modules.html "Built-in modules with mandatory `node:` prefix" - "This requirement exists to prevent newly introduced built-in modules from having a conflict with user land packages" (list includes `node:sqlite`, `node:test`). Why is fully sourced, but both snippets call `readFile(path)` with one argument (see rejects).
- `lint-no-this-alias`: "Disallow aliasing `this`"; "Assigning a variable to `this` instead of properly using arrow lambdas may be a symptom of pre-ES6 practices".
- `lint-no-inferrable-types`: "in some cases can prevent TypeScript from inferring a more specific literal type (e.g. `10`) instead of the more general primitive type (e.g. `number`)". Declaration-emit probe: `a: number` vs `b = 0`.
- `lint-boolean-literal-compare`: "Comparing boolean values to boolean literals is unnecessary: those comparisons result in the same booleans ... Using the boolean values directly, or via a unary negation (`!value`), is more concise and clearer."
- `lint-no-unsafe-assignment`: "Disallow assigning a value with type `any` to variables and properties"; "There are cases where the rule allows assignment of `any` to `unknown`" (supports the summary's advice). Probe: tsc under `--strict` accepts the Bad `any` flow with no diagnostic.
- `lint-no-unused-vars`: page exists ("Disallow unused variables"). Probe: tsc `--noUnusedLocals` independently flags the Bad binding (TS6133), Good clean.
- `lint-no-unnecessary-type-assertion`: "reports when a type assertion does not change the type of an expression".
- `lint-strict-boolean-expressions`: "Forbids usage of non-boolean types in expressions where a boolean is expected"; "nullable numbers are considered unsafe by default".
- `lint-consistent-return`: "Require return statements to either always or never specify values" (extension rule, not deprecated). Probe: `--noImplicitReturns` does not flag the bare/value mix, so the rule adds the check the Why describes.
- `lint-no-unnecessary-condition`: "Disallow conditionals where the type is always truthy or always falsy"; the page's own example is `arg?.length` on a non-nullish `arg`.
- `lint-no-unsafe-return`: "Disallow returning a value with type `any` from a function". Probe: tsc under `--strict` accepts the Bad return with no diagnostic.
- `lint-prefer-nullish-coalescing`: "The `??` nullish coalescing runtime operator ... only coalesces when the original value is `null` or `undefined` ... much safer than ... `||`, which coalesces on any falsy value." Probe: `"" || "default"` -> `"default"`, `"" ?? "default"` -> `""`, `0 || 1` -> `1`, `0 ?? 1` -> `0`.
- `lint-prefer-optional-chain`: "`?.` optional chain expressions provide `undefined` if an object is `null` or `undefined` ... much safer than relying upon logical AND operator chaining `&&`; which chains on any truthy value."

None of the 12 lint rule pages carry a rule-level deprecation banner.

## Compile results

- 48/48 snippets pass the exact harness command (24 rules x Bad/Good), TypeScript 5.9.3, zero diagnostics; the deterministic validator reports 0 issues across the 24 files.
- Enforcement probes reproduced the claimed compiler behavior on the Bad forms: TS1294 (`erasableSyntaxOnly`), TS1484 (`verbatimModuleSyntax`), TS1205 (`isolatedModules`), TS2835 (ESM nodenext extension), TS6133 (`noUnusedLocals`); Good forms clean.
- Resolved-module compile of the two `node:fs` snippets (with `@types/node` visible) fails: both Bad and Good produce TS2554 "Expected 2-3 arguments, but got 1" and TS2322 "Type 'void' is not assignable to type 'string'".

## Behavior probe results (Node v26.8.1, bounded)

- `mod-import-attributes`: Bad -> `ERR_IMPORT_ATTRIBUTE_MISSING`; Good -> `1`.
- `mod-subpath-imports`: `#lib/format.js` mapped through `imports` -> `subpath-ok`.
- `mod-public-entry`: deep subpath -> `ERR_PACKAGE_PATH_NOT_EXPORTED`; package name -> `entry-ok`.
- `mod-lazy-dynamic-import`: static -> module evaluated before first statement; dynamic -> `before import: undefined`, `after import: 1`.
- `mod-import-meta-locate`: `new URL("./data.json", import.meta.url)` resolves to the module directory when run from `cwd=/`.
- `mod-no-require`: `require(esm) => 42` (ESM-only package loadable); bare `require` in an `.mjs` -> `ReferenceError: require is not defined in ES module scope`.
- `lint-prefer-nullish-coalescing`: `||` replaces `""`/`0`; `??` does not.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-mod-import-attributes | verified | esm.html mandatory JSON attribute + dynamic form; MDN options; probe ERR_IMPORT_ATTRIBUTE_MISSING/1; review is correct (loader-level) |
| typescript-mod-subpath-imports | verified | packages.html "must always start with #", private mappings; probe resolves via `imports` map |
| typescript-mod-erasable-syntax | verified | erasableSyntaxOnly + nodejs/typescript.html construct lists; probe TS1294; Good const object idiomatic |
| typescript-mod-type-only-imports | verified | nodejs/typescript.html "treat the import as a value import ... runtime error"; verbatimModuleSyntax drops type modifier; probe TS1484 |
| typescript-mod-lazy-dynamic-import | verified | MDN "only evaluated when needed", promise for namespace; probe timing |
| typescript-mod-type-only-exports | verified | isolatedModules "error to export a name that only refers to a type"; consistent-type-exports; probe TS1205 |
| typescript-mod-import-meta-locate | verified | esm.html import.meta.url absolute file URL + relative-loading pattern; probe from foreign cwd |
| typescript-mod-file-extensions | verified | esm.html mandatory extensions; nodejs/typescript.html mandatory in import/import(); probe TS2835; `tsc:moduleResolution` id consistent with pack convention |
| typescript-mod-public-entry | verified | packages.html exports encapsulation + ERR_PACKAGE_PATH_NOT_EXPORTED; probe deep vs entry; review correct |
| typescript-mod-namespace-imports | verified | Google guide named-vs-namespace wording matches summary exactly |
| typescript-mod-no-require | rejected | Why's "cannot load ESM-only packages" false on baseline (probe `require(esm) => 42`; modules.html feature no longer experimental); Good `readFile(path)` fails TS2554/TS2322 when `node:fs` resolves |
| typescript-mod-node-builtin-prefix | rejected | Why sourced (modules.html mandatory `node:` prefix) but both snippets call `readFile(path)` with one arg; resolved compile TS2554 + TS2322 (masked only by unresolved-import stub) |
| typescript-lint-no-this-alias | verified | page "Disallow aliasing this" + pre-ES6 wording; both snippets compile |
| typescript-lint-no-inferrable-types | verified | page literal-widening sentence; declaration-emit probe `a: number` vs `b = 0` |
| typescript-lint-boolean-literal-compare | verified | page "comparisons result in the same booleans ... use directly or negate" |
| typescript-lint-no-unsafe-assignment | verified | page "allows assignment of any to unknown"; probe tsc accepts Bad any flow silently |
| typescript-lint-no-unused-vars | verified | page exists; probe tsc `--noUnusedLocals` TS6133 on Bad, Good clean |
| typescript-lint-no-unnecessary-type-assertion | verified | page "reports when a type assertion does not change the type" |
| typescript-lint-strict-boolean-expressions | verified | page "Forbids non-boolean types where a boolean is expected"; nullable numbers unsafe |
| typescript-lint-consistent-return | verified | page "always or never specify values"; not deprecated; probe `noImplicitReturns` misses the mix |
| typescript-lint-no-unnecessary-condition | verified | page "always truthy or always falsy"; `arg?.length` example matches Bad |
| typescript-lint-no-unsafe-return | verified | page "Disallow returning a value with type any"; probe tsc accepts Bad silently |
| typescript-lint-prefer-nullish-coalescing | verified | page nullish-vs-falsy wording; probe `||` vs `??` on `""`/`0` |
| typescript-lint-prefer-optional-chain | verified | page "safer than &&, which chains on any truthy value" |

## Rejects (left `status: draft`)

1. `typescript-mod-no-require` - the Why asserts `require()` "cannot load ESM-only packages", which is not in the cited sources and is false on the baseline: Node modules.html documents "Loading ECMAScript modules using require()" as no longer experimental (v25.4.0), and a Node v26.8.1 probe loaded an ESM-only package (`require(esm) => 42`). Additionally, the Good snippet's `readFile(path)` fails TS2554/TS2322 against `@types/node` (masked by the unresolved-import stub). Fix: drop or qualify the clause (`require` is unavailable in ESM files; ESM modules with top-level await cannot be required) and use a correctly typed builtin call (e.g. `readFileSync(path, "utf8")` or `node:fs/promises` with `await`).
2. `typescript-mod-node-builtin-prefix` - the Why and the `node:` decision are fully sourced, but both snippets call `readFile(path)` with one argument. With `@types/node` resolvable (any real Node project), both fail TS2554 "Expected 2-3 arguments, but got 1" and TS2322 "Type 'void' is not assignable to type 'string'"; the harness passes only because the unresolved import is stubbed to `any`. Fix: use a one-argument builtin (`existsSync(path)`) or a correct signature (`readFileSync(path, "utf8")`).

## Other checks

- No version numbers in any of the 24 files; `baseline: latest` on all.
- Summary <= 30 words, no hedging; exactly one `## Bad`/`## Good` with a `typescript` fence each; snippets <= 25 lines; no TODO/elisions/Unicode ellipsis.
- All `related` ids and all See Also links resolve; no duplicate or near-duplicate pairs (Jaccard >= 0.45) within the pack.
- Repo deterministic validator: all 24 batch files clean; the single pack error is in `style-array-type.md` (non-batch, pre-existing).
- `sec-no-eval` was not touched.

## Counts

- Verified: 22/24 (flipped `status: draft` -> `status: verified`)
- Rejected: 2/24 (left `status: draft`: `typescript-mod-no-require`, `typescript-mod-node-builtin-prefix`)

## Addendum - re-verification of the two rejects (2026-10-05)

Both fixes were re-checked from scratch against the same toolchain and harness flags.

- `typescript-mod-no-require` (fix): the false "cannot load ESM-only packages" clause is gone. The new Why is supported: Node typescript.html "Node.js will not convert from one module system to another" plus the probed ESM runtime error (`ReferenceError: require is not defined in ES module scope`); the "compiles to require when the output target is CommonJS" clause matches the no-require-imports page ("transformed to `require()` calls during transpilation when outputting CommonJS"). The "invisible to the static module graph" rationale is not verbatim on the cited page (which says bare `require()` calls "are not statically analyzed by TypeScript") - noted as rationale, not blocking. The Good now uses `readFileSync(path, "utf8")`; both Bad and Good compile clean with the harness and, minus the harness directive, with the repo's real `@types/node` under the exact flags. Flipped `status: draft` -> `status: verified`.
- `typescript-mod-node-builtin-prefix` (fix): both snippets now call `readFileSync(path, "utf8")`; both compile clean with the harness and with real `@types/node` under the exact flags (the prior TS2554/TS2322 are gone). Runtime sanity: `readFileSync(path, "utf8")` returns a string. Flipped `status: draft` -> `status: verified`.
- Convention note (unchanged from the main report): compiling the snippets verbatim with the `@ts-expect-error` line against a resolved `@types/node` yields TS2578 "Unused '@ts-expect-error' directive" - the shared harness-annotation artifact of all `mod-*` snippets; the code minus the annotation is what compiles in a real project.
- Mechanical re-check: repo validator 0 issues and both snippets compile for each file; no version numbers; sections, links, and `related` ids intact.

Final batch counts after the addendum: 24/24 verified, 0 rejected.

