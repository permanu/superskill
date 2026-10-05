# Verification Report - TypeScript Batch 7 (`data`, `proj`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `data-*.md` + 7 `proj-*.md` (19 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1; TypeScript 5.9.3 (`node /Users/arvee/Documents/superskill/node_modules/typescript/bin/tsc`)
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/ts-batch7` (fetched pages, extracted snippets, tsc/option outputs, Node probes)

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; treated every rule as unverified until each check passed.
2. Fetched all 18 distinct cited URLs (11 MDN, 2 RFC, 1 TypeScript Handbook, 7 TSConfig option pages). All returned HTTP 200; each was converted to text and grepped for the claim-specific passages quoted below.
3. Extracted both fenced snippets from all 19 rules (38) and compiled each with the exact harness command, first through the repo validator (`dist/rules/validate.js`, same flags as `src/rules/harness/typescript.ts`) and then as a direct `tsc` sweep: 38/38 clean, zero diagnostics.
4. Probed the 7 `proj` rules with their named tsconfig option enabled (`--noPropertyAccessFromIndexSignature`, `--noImplicitOverride`, `--noImplicitReturns`, `--noFallthroughCasesInSwitch`, `--allowUnreachableCode false`, `--isolatedDeclarations --declaration`, `--lib es2022`): every Bad reproduced the stated diagnostic (TS4111/4114/7030/7029/7027/9010/2584) and every Good was clean under the same option.
5. Ran bounded Node v26.8.1 behavior probes for the runtime-observable `data` decisions (date serialization under two time zones, Date.parse NaN, undefined omission vs null, class serialization leak, Map/Set `{}` and BigInt TypeError, non-finite -> null, 2^53+1 precision collapse, canonical digest equality, Error `{}`, NFC normalization, integer-like key reordering) plus a type-level negative probe for the literal union.
6. Mechanical checks: per-file validator run (0 issues across the 19 files), pack run `node dist/rules/cli.js validate --lang typescript --no-compile` (165 rules, 0 errors, 0 warnings), See Also link existence, `related` resolution (validator), version-number scan, duplicate-title/summary check, and token-Jaccard near-duplicate scan within the batch and against the whole TypeScript pack (no pair at or above 0.45).

## `proj` convention assessment ("compiles by default, fails under the option")

Acceptable for config rules. The `proj` rules do not demonstrate code that is wrong under default `tsc`; they demonstrate code that violates an opt-in compiler option, and the option is the enforcement mechanism the rule names (`enforce: tool` + `tool: "tsc:<option>"`, the pack's established convention, e.g. verified `mod-erasable-syntax`). The contract's compile requirement is that Bad and Good compile under the harness (they do: 38/38), and the rule's actual claim is the differential: with the option on, Bad fails and Good passes. That differential was reproduced for all 7 (codes below). A rule of this class would only be defective if the option did not flag the Bad, flagged the Good, or the diagnostic did not match the rule's stated behavior - none of which occurred. The `isolatedDeclarations` probe additionally confirmed TS5069 when the option is set without `declaration`/`composite`, so the option alone is not a runnable configuration; with `--declaration` the Bad fails TS9010 exactly as claimed.

## Source evidence (claim-specific)

- `data-date-iso`: MDN `toISOString` - "a simplified format based on ISO 8601, which is always 24 or 27 characters long"; "The timezone is always UTC, as denoted by the suffix Z." MDN `JSON.stringify` - "Date objects implement `toJSON()`, which returns the same as `toISOString()`." Probe: `toString()` differs by time zone (`GMT+0000` vs `GMT-0500` for the same instant) while `toISOString()` is fixed and `Date.parse` round-trips it. Note: the Why's sentence about `toString` depending on host locale/timezone is not on the cited `toISOString` page; it is standard behavior and was probe-confirmed.
- `data-date-parse-check`: MDN `Date.parse` - "If dateString fails to be parsed as a valid date, `NaN` is returned." Probe: `Date.parse("nope")` and `new Date("nope").getTime()` both `NaN`, `Number.isNaN` -> true.
- `data-null-not-undefined`: MDN `JSON.stringify` - "`undefined`, Function, and Symbol values are not valid JSON values. If any such values are encountered during conversion, they are either omitted (when found in an object) or changed to null (when found in an array)." MDN `JSON` - "no support for `undefined`". Probe: `{"a":undefined}` -> `{}` (key absent), `{"a":null}` -> `{"a":null}`.
- `data-explicit-wire-shape`: MDN `JSON.stringify` - "Only enumerable own properties are visited." Probe: stringifying the class instance leaked `internalNotes`; the explicit wire object did not.
- `data-json-special-values`: MDN `JSON.stringify` - "Only enumerable own properties are visited. This means `Map`, `Set`, etc. will become `"{}"`."; "Attempting to serialize BigInt values will throw." Probe: Map and Set both `{}`, `JSON.stringify(1n)` -> `TypeError: Do not know how to serialize a BigInt`, `Object.fromEntries(map)` -> `{"a":1}`.
- `data-json-non-finite`: MDN `JSON.stringify` - "The numbers `Infinity` and `NaN`, as well as the value `null`, are all considered `null`." Probe: `{"x":NaN,"y":Infinity,"z":-Infinity}` -> all `null`.
- `data-large-integers`: MDN `Number.MAX_SAFE_INTEGER` - "represents the maximum safe integer in JavaScript (2^53 - 1). For larger integers, consider using BigInt"; "it can only safely represent integers between ...". MDN `JSON` lossless-number section - "it is not possible to represent all JSON numbers exactly in JavaScript, because JavaScript uses floating point representation"; "you may want to serialize the number as a string". Probe: `Number(9007199254740993n)` -> `9007199254740992`, `JSON.parse('{"id":9007199254740993}').id` -> `9007199254740992`, `id.toString()` preserves the digits. Note: the Why attributes the double representation to JSON numbers; the cited MDN page attributes it to JavaScript's handling of JSON numbers (JSON text itself may carry arbitrary precision).
- `data-json-canonical`: RFC 8785 - "The output from JCS is a 'hashable' representation of JSON data that can be used by cryptographic methods."; "JSON object properties MUST be sorted recursively"; "deterministic property sorting"; and on plain stringify: properties "are kept in the order they were created or received". Probe: `{b,a}` and `{a,b}` hash differently; a sorted-key canonical form hashes equally.
- `data-error-serialization`: MDN `Error` - `message`/`name` are the stable instance fields; MDN `JSON.stringify` - only enumerable own properties are visited. Probe: `JSON.stringify(new Error("boom"))` -> `{}`, `Object.keys(error)` -> `[]`; explicit `{name, message}` -> `{"name":"Error","message":"boom"}`. REJECTED on summary/body mismatch; see Rejects.
- `data-literal-union`: TypeScript Handbook (Everyday Types) - literal types and unions ("Type '"howdy"' is not assignable to type '"hello"'"; parameter type `"left" | "right" | "center"`). Type probe: with the Good union, `{status:"cancelled"}` fails TS2322; with the Bad `string`, it compiles.
- `data-unicode-normalize`: MDN `String.prototype.normalize` - "two sequences of code points have canonical equivalence if they represent the same abstract characters"; "You can use normalize() using the 'NFD' or 'NFC' arguments to produce a form of the string that will be the same for all canonically equivalent strings."; "If omitted or undefined, 'NFC' is used." Probe: `"\u00F1" !== "n\u0303"` raw, equal after `normalize()` (NFC -> U+00F1).
- `data-key-order`: RFC 8259 - "An object is an unordered collection of zero or more name/value pairs". MDN `Object.keys` - "The order of the array returned by Object.keys() is the same as that provided by a for...in loop"; its example `{100:'a', 2:'b', 7:'c'}` -> `['2','7','100']` ("random key ordering"). Probe reproduced `["2","7","100"]` for insertion order `["100","2","7"]`; the array form preserved order.
- `proj-no-property-access-from-index-signature`: TSConfig page - "Without this flag, TypeScript will allow you to use the dot syntax to access fields which are not defined"; TS4111 "Property 'theme' comes from an index signature, so it must be accessed with ['theme']"; "The goal of this flag is to signal intent in your calling syntax about how certain you are this property exists."
- `proj-no-implicit-override`: TSConfig page - a renamed base member leaves the subclass "out of sync" with no warning; "Using noImplicitOverride you can ensure that the sub-classes never go out of sync, by ensuring that functions which override include the keyword override"; TS4114.
- `proj-no-implicit-returns`: TSConfig page - "When enabled, TypeScript will check all code paths in a function to ensure they return a value." Probe (rule's `string | undefined` form): Bad compiles by default and fails TS7030 "Not all code paths return a value" under the option; Good clean. (The page's own example uses return type `string` and shows TS2366; the rule's variant isolates TS7030 and the page's statement covers both.)
- `proj-no-fallthrough-cases`: TSConfig page - "Report errors for fallthrough cases in switch statements. Ensures that any non-empty case inside a switch statement includes either break, return, or throw." TS7029.
- `proj-no-unreachable-code`: TSConfig page - "undefined (default) provide suggestions as warnings to editors"; "false raises compiler errors about unreachable code"; TS7027. Probe: Bad rc=0 by default, TS7027 with `--allowUnreachableCode false`; Good clean.
- `proj-isolated-declarations`: TSConfig page - "Require sufficient annotation on exports so other tools can trivially generate declaration files." Probe: `--isolatedDeclarations --declaration` -> Bad fails TS9010 "Variable must have an explicit type annotation with --isolatedDeclarations", Good clean; option without `declaration` -> TS5069. Note: the page is a one-liner and defers the mechanism to the linked 5.5 release notes; the Why's "computed without the rest of the program" elaboration is consistent but not spelled out on the cited page.
- `proj-lib-runtime`: TSConfig page - "TypeScript includes a default set of type definitions for built-in JS APIs (like Math), as well as type definitions for things found in browser environments (like document)."; "Your program doesn't run in a browser, so you don't want the 'dom' type definitions". Probe: Bad compiles by default (default lib includes DOM), fails TS2584 "Cannot find name 'document' ... include 'dom'" under `--lib es2022`; Good clean.

## Compile results

- 38/38 snippets pass the exact harness command (19 rules x Bad/Good), TypeScript 5.9.3, zero diagnostics.
- The deterministic validator reports 0 issues across the 19 files; pack run reports 165/165 clean (0 errors, 0 warnings).

## Option probe results (Bad fails / Good clean)

| rule | option probed | Bad diagnostic | Good |
|---|---|---|---|
| proj-no-property-access-from-index-signature | `--noPropertyAccessFromIndexSignature` | TS4111 | rc=0 |
| proj-no-implicit-override | `--noImplicitOverride` | TS4114 | rc=0 |
| proj-no-implicit-returns | `--noImplicitReturns` | TS7030 | rc=0 |
| proj-no-fallthrough-cases | `--noFallthroughCasesInSwitch` | TS7029 | rc=0 |
| proj-no-unreachable-code | `--allowUnreachableCode false` | TS7027 | rc=0 |
| proj-isolated-declarations | `--isolatedDeclarations --declaration` | TS9010 (TS5069 without `--declaration`) | rc=0 |
| proj-lib-runtime | `--lib es2022` | TS2584 | rc=0 |

## Behavior probe results (Node v26.8.1, bounded)

- Date: `toString()` `GMT+0000` vs `GMT-0500` for the same instant; `toISOString()` fixed `2026-01-02T03:04:05.006Z`, `Date.parse` round-trips.
- Date.parse: `NaN` for invalid input; `new Date(invalid).getTime()` also `NaN`.
- JSON: `{a:undefined}` -> `{}`; `{a:null}` -> `{"a":null}`; Map/Set -> `{}`; `1n` -> TypeError; NaN/Infinity/-Infinity -> `null`.
- Integers: `Number(9007199254740993n)` -> `9007199254740992`; `Number(2^53+1) === Number(2^53+2)`; string form preserves digits.
- Canonicalization: different key order -> different SHA-256; sorted-key canonical form -> equal digest.
- Error: `JSON.stringify(new Error("boom"))` -> `{}`; explicit `{name, message}` -> `{"name":"Error","message":"boom"}`.
- Unicode: composed vs decomposed ñ unequal raw, equal after `normalize()`.
- Key order: `{100,2,7}` -> `Object.keys` `["2","7","100"]`.
- Literal union: typo value accepted by `string`, rejected TS2322 by the union.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| typescript-data-date-iso | verified | MDN toISOString format/UTC + stringify `toJSON` = `toISOString`; TZ probe | toString sentence unsourced but probe-confirmed |
| typescript-data-date-parse-check | verified | MDN parse "NaN is returned"; NaN probe | - |
| typescript-data-null-not-undefined | verified | MDN stringify omission rule + JSON "no support for undefined"; probe | - |
| typescript-data-explicit-wire-shape | verified | MDN stringify "Only enumerable own properties are visited"; leak probe | - |
| typescript-data-json-special-values | verified | MDN stringify Map/Set `{}` + BigInt throw; probe | - |
| typescript-data-json-non-finite | verified | MDN stringify Infinity/NaN -> null; probe | - |
| typescript-data-large-integers | verified | MDN MAX_SAFE_INTEGER + JSON lossless section; collapse probe | Why attributes double precision to JSON numbers; MDN attributes it to JS |
| typescript-data-json-canonical | verified | RFC 8785 hashable/canonical + insertion-order statement; digest probe | Good delegates to a declared canonicalizer (declaration-level, compiles) |
| typescript-data-error-serialization | **rejected** | summary promises a `code` field; Good serializes only `name`/`message`; probe `{}` | see Rejects |
| typescript-data-literal-union | verified | TS Handbook literal types/unions; TS2322 negative probe | - |
| typescript-data-unicode-normalize | verified | MDN normalize canonical equivalence + NFC default; probe | - |
| typescript-data-key-order | verified | RFC 8259 "unordered collection" + MDN Object.keys ordering example; probe | - |
| typescript-proj-no-property-access-from-index-signature | verified | TSConfig TS4111 + intent wording; option probe | config convention assessed above |
| typescript-proj-no-implicit-override | verified | TSConfig out-of-sync wording + TS4114; option probe | config convention assessed above |
| typescript-proj-no-implicit-returns | verified | TSConfig "check all code paths"; TS7030 probe | page example is TS2366; rule isolates TS7030 |
| typescript-proj-no-fallthrough-cases | verified | TSConfig non-empty case rule + TS7029; option probe | config convention assessed above |
| typescript-proj-no-unreachable-code | verified | TSConfig "false raises compiler errors" + TS7027; option probe | config convention assessed above |
| typescript-proj-isolated-declarations | verified | TSConfig "Require sufficient annotation on exports"; TS9010/TS5069 probe | page is one line; mechanism from linked release notes |
| typescript-proj-lib-runtime | verified | TSConfig default DOM + "don't want the dom type definitions"; TS2584 probe | config convention assessed above |

## Rejects (left `status: draft`)

1. `typescript-data-error-serialization` - summary/body mismatch. The summary says "Serialize `name`, `message`, and a code explicitly", but the Good serializes only `{ name: error.name, message: error.message }`; no `code` appears anywhere in the body, and the cited sources (MDN `Error`, MDN `JSON.stringify`) document no `code` field on `Error` (the baseline `Error` type has no `code` property either). The core decision is sound (probe: `JSON.stringify(new Error("boom"))` -> `{}`), so the fix is a one-line summary edit - e.g. "Serialize `name` and `message` explicitly; `JSON.stringify(error)` writes an empty object." - or extending the Good with a typed code field plus a source for it. All other checks on this file passed (compiles, sources, no duplicates, links).

## Other checks

- No version numbers in any of the 19 files; `baseline: latest` on all; no `compile_exempt`.
- Summaries <= 30 words, no hedging, no forbidden tokens/elisions; exactly one `## Bad`/`## Good` with a `typescript` fence each; snippets <= 25 lines; no trailing whitespace.
- All `related` ids resolve and all See Also links exist; INDEX.md covers every file (pack validator clean at both runs: 165/165 when checked mid-verification, 193/193 at final re-check; the pack was being extended by other batches in parallel).
- Near-duplicate scan (title+summary token Jaccard) within the batch: highest pair is 0.20 (`data-literal-union` vs `data-null-not-undefined`, distinct decisions); no cross-pack pair reaches 0.45; no duplicate titles or summaries. Closest semantic pairs reviewed and distinct: `data-null-not-undefined` vs `type-optional-not-undefined` (wire vs internal), `data-json-canonical` vs `data-key-order` (canonical digest vs ordered data), `data-explicit-wire-shape` vs `api-minimal-surface` (payload vs exports), `proj-no-implicit-returns` vs `lint-consistent-return` (option vs lint).
- Post-flip re-validation: 18 flipped files clean; the 19-file set still 0 issues / 38-38 compile (status changes only).
- Only the 19 batch files (18 `status` flips) and this report were edited; `INDEX.md` and other rules were not touched.

## Counts

- Verified: 18/19 (flipped `status: draft` -> `status: verified`)
- Rejected: 1/19 (left `status: draft`: `typescript-data-error-serialization`)
- Addendum: `typescript-data-error-serialization` re-checked after the summary fix ("Serialize `name` and `message` explicitly") - validator 0 issues, both snippets compile clean (tsc 5.9.3), no other changes; flipped to `verified`. Final count: verified 19/19, rejected 0.
