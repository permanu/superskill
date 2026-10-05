# Verification Report - TypeScript Batch 4 (`api`, `sec`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 16 `api-*.md` + 13 `sec-*.md` (29 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1; TypeScript 5.9.3 (`node /Users/arvee/Documents/superskill/node_modules/typescript/bin/tsc`)
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/ts-batch4` (fetched pages, snippets, tsc outputs, behavior probes)

## Method

1. Fetched every distinct cited URL (29 total: TypeScript Handbook jsdoc/functions/generics/everyday-types/objects/iterators/modules/classes/utility-types, Google TypeScript Style Guide, typescript-eslint no-deprecated/explicit-module-boundary-types/no-implied-eval, MDN eval/innerHTML/prototype pollution/RegExp/RegExp.escape/postMessage/fetch/getRandomValues, OWASP error handling/CSRF/XSS/secrets management/TLS sheets, RFC 9110, Node process/crypto docs). All returned HTTP 200 and were read for the claim-specific passages quoted below.
2. Extracted both fenced snippets from each rule (58) and compiled each with the exact harness command.
3. Ran bounded Node probes for the rules whose claims are behavioral (28 run cases + 10 type-level cases: inference flow, declaration merging, readonly returns, `this` polymorphism, union-vs-overload acceptance, prototype pollution, postMessage origin/target guards, credentials option, timing-safe compare, secure random).
4. Mechanical lint: frontmatter fields, id/path match, `baseline: latest`, summary word count and hedging, one `## Bad`/`## Good` with a `typescript` fence each, anti-slop tokens/elisions, snippet line cap, `related` and See Also resolution, version-number scan, near-duplicate scan across the pack (Jaccard >= 0.45, none hit).
5. Ran the repo deterministic validator (read-only): `node dist/rules/cli.js validate --lang typescript --json --no-compile` -> 0 errors / 0 warnings for all 29 batch files (the 4 reported errors are in other, non-batch files).

## Source evidence (claim-specific)

- `api-deprecate-with-jsdoc`: TS Handbook JSDoc Reference lists `@deprecated` and says the information "is surfaced in completion lists and as a suggestion diagnostic that editors can handle specially"; typescript-eslint `no-deprecated` page exists as cited.
- `api-explicit-return-types`: typescript-eslint `explicit-module-boundary-types` - "Require explicit return and argument types on exported functions' and classes' public class methods"; the Bad snippet is exactly the unannotated exported function. Note: the cited Handbook functions page demonstrates annotated returns in examples but has no dedicated "return type annotations" section; the primary source carries the claim.
- `api-generic-inference`: Handbook functions "Push Type Parameters Down" - `firstElement1<Type>(arr: Type[])` infers `number`, `firstElement2<Type extends any[]>(arr: Type)` yields `any`. Type probe: Bad returns `unknown` (assigning to `number | undefined` fails TS2322); Good infers `number | undefined`.
- `api-immutable-exports`: Google TS Guide "Mutable exports" - "export let is not allowed"; "In TS, if foo is re-exported by a second file, importers will not see the value change"; "use explicit getter functions".
- `api-interface-for-objects`: Handbook Everyday Types - "a type cannot be re-opened to add new properties vs an interface which is always extendable"; "Interfaces will always be named in error messages"; "Type aliases may not participate in declaration merging, but interfaces can". Type probe: a second `export interface User` merges cleanly; a second `export type User` fails TS2300.
- `api-iterable-params`: Handbook Iterators and Generators - "An object is deemed iterable if it has an implementation for the `Symbol.iterator` property", listing `Array`, `Map`, `Set`, `String`, typed arrays; the page's own example is `toArray<X>(xs: Iterable<X>)`. Probe: Good accepts `Set` and a generator; Bad's `reduce` throws `TypeError` on a `Set`.
- `api-minimal-surface`: Google TS Guide - "Only export symbols that are used outside of the module. Generally minimize the exported API surface of modules."
- `api-modules-over-namespaces`: Google TS Guide - "Use modules not namespaces ... namespaces are disallowed ... To semantically namespace your code, use separate files." Note: the Why's bundler/tree-shaking sentence is a rationale beyond the cited wording; the decision itself is directly supported.
- `api-named-exports`: Google TS Guide - "Use named exports in all code ... Do not use default exports ... Default exports provide no canonical name"; "Named exports have the benefit of erroring when import statements try to import something that hasn't been declared."
- `api-no-static-class`: Handbook Classes "Why No Static Classes?" - "a regular object (or even top-level function) will do the job just as well", with the exact unnecessary-static-class example.
- `api-options-object`: Google TS Guide destructuring section - `interface Options { num?: number; str?: string; } function destructured({num, str = 'default'}: Options = {}) {}`; Handbook Object Types optional properties. Probe: defaults resolve to `false`/`3`.
- `api-parameter-properties`: Google TS Guide - "Rather than plumbing an obvious initializer through to a class member, use a TypeScript parameter property"; Handbook Classes documents the same syntax.
- `api-readonly-fields`: Handbook Classes - "readonly Fields may be prefixed with the readonly modifier. This prevents assignments to the field outside of the constructor"; Google TS Guide - "Mark properties that are never reassigned outside of the constructor with the readonly modifier".
- `api-readonly-returns`: Handbook Object Types "The ReadonlyArray Type" - "describes arrays that shouldn't be changed"; Handbook Utility Types `Readonly<Type>`. Type probe: `tags().push("c")` fails TS2339 on the Good return type and compiles on the Bad.
- `api-this-return-type`: Handbook Classes "this Types" - "a special type called `this` refers dynamically to the type of the current class". Type probe: subclass chain keeps `extra()` on the Good and fails TS2339 on the Bad.
- `api-union-over-overload`: Handbook functions "Writing Good Overloads" - "Always prefer parameters with union types instead of overloads when possible". Type probe: `string | string[]` fails the overload pair (TS2769) and passes the union.
- `sec-error-response-generic`: OWASP Error Handling Cheat Sheet - "a generic response is returned by the application but the error details are logged server side for investigation, and not returned to the user"; the sheet's own disclosure examples show stack traces and SQL/path leakage.
- `sec-fetch-credentials`: MDN Using Fetch - "include: always include credentials, even cross-origin"; "same-origin (the default)"; "Including credentials in cross-origin requests can make a site vulnerable to CSRF attacks". Probe: stubbed `fetch` captured `credentials: "same-origin"` (Good) vs `"include"` (Bad).
- `sec-no-eval`: MDN eval - "Never use direct eval()! ... eval() executes the code it's passed with the privileges of the caller"; "The same risk appears in the implied form" matches MDN-adjacent typescript-eslint wording. REJECTED on the tool claim (see below).
- `sec-no-innerhtml`: MDN Element.innerHTML warning - "This property parses its input as HTML ... known as injection sinks ... vector for cross-site scripting (XSS)"; "Node.textContent should be used when you know that the user-provided content should be plain text"; OWASP XSS sheet - "elem.textContent = dangerVariable". Probe: Good writes text without touching `innerHTML`.
- `sec-no-merge-untrusted`: MDN Prototype pollution - "merged into another object via Object.assign(), for...in loops, etc., then the implicit property assignment operation will trigger the setter"; "A key attack vector is the `__proto__` property"; "`yourObject.constructor.prototype`". Probe: Bad's `Object.assign` result gets a hijacked prototype (`proto.polluted === true`) while `Object.prototype` stays clean; Good ignores the `__proto__` key and returns `"cors"`.
- `sec-no-secrets-in-url`: RFC 9110 §17.9 "Disclosure of Sensitive Information in URIs" - "Many servers, proxies, and user agents log or display the target URI in places where it might be visible to third parties. It is therefore unwise to include information within a URI that is sensitive". Probe: Good keeps the token out of the URL and in the `authorization` header.
- `sec-no-user-regex`: MDN `RegExp.escape()` - escaping "special characters in a string"; MDN RegExp documents literal vs constructor compilation. Probe: escaped `.`/`+`/`[` match literally; the Bad's raw `.` matches any character. Note: the Why's ReDoS sentence is not sourced by the two cited pages (rationale only).
- `sec-postmessage-origin`: MDN Window.postMessage "Security concerns" - "always verify the sender's identity using the `origin` and possibly `source` properties. Any window (including, for example, `http://evil.example.com`) can send a message". Probe: hostile origin is dropped, trusted origin logged.
- `sec-postmessage-target`: MDN - "Always specify an exact target origin, not `*` ... A malicious site can change the location of the window without your knowledge, and therefore it can intercept the data sent using postMessage". Probe: Good sends to `https://app.example.com`, Bad to `*`.
- `sec-secrets-from-env`: OWASP Secrets Management - "Many organizations have them hardcoded within the source code in plaintext"; "centralize the storage, provisioning, auditing, rotation and management of secrets"; Node process docs document `process.env`. Probe: env value read; missing value throws.
- `sec-secure-random`: MDN `Crypto.getRandomValues()` - "lets you get cryptographically strong random values ... pseudo-random number generator seeded with a value with enough entropy"; OWASP - "secure randomness". Probe: 32-hex token, two calls differ.
- `sec-timing-safe-compare`: Node crypto - `crypto.timingSafeEqual(a, b)` "compares the underlying bytes ... using a constant-time algorithm. This function does not leak timing information ... suitable for comparing ... secret values"; throws on different byte lengths, matching the snippet's length guard. Probe against real `node:crypto.timingSafeEqual`: equal/different/different-length all correct.
- `sec-tls-only`: OWASP TLS Cheat Sheet - "TLS can provide ... Confidentiality: Provides protection against attackers reading"; OWASP Secrets Management - "Transport Layer Security (TLS) Everywhere". Probe: Good builds an `https://` URL.

## Compile results

58/58 snippets compile with the exact harness command (29 rules x Bad/Good), zero diagnostics, TypeScript 5.9.3. This includes the `declare`-stub snippets (`sec-postmessage-target`, `sec-secrets-from-env`, `sec-timing-safe-compare`), a pattern already used by verified batch-1/2 rules.

## Behavior probe results (Node v26.8.1, bounded)

- 38 runtime probes pass; 10 type-level probes behave as the rules claim (details in the evidence column). Representative:
  - `api-iterable-params`: Bad `reduce` on a `Set` throws `TypeError`; Good totals `Set` and generator.
  - `api-union-over-overload` / `api-generic-inference` / `api-this-return-type` / `api-readonly-returns` / `api-interface-for-objects`: Bad/Good compile-outcome deltas reproduced (TS2769, TS2322, TS2339, TS2300).
  - `sec-no-merge-untrusted`: `Object.assign({...}, JSON.parse('{"__proto__":{"polluted":true}}'))` hijacks the merged target's prototype; the Good reads known keys only.
  - `sec-fetch-credentials`, `sec-postmessage-origin`, `sec-postmessage-target`: stubbed environments show the Good variant refuses cross-origin credentials / hostile origins / wildcard targets.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-api-deprecate-with-jsdoc | verified | JSDoc `@deprecated` surfaced by editors; typescript-eslint no-deprecated exists; compile + run clean |
| typescript-api-explicit-return-types | verified | `explicit-module-boundary-types` requires the exact annotation the Bad omits; tool id matches scope |
| typescript-api-generic-inference | verified | Handbook "Push Type Parameters Down"; type probe: Bad `unknown` vs Good inferred `number \| undefined` |
| typescript-api-immutable-exports | verified | Google "export let is not allowed" + re-export staleness wording; getter/setter pattern matches |
| typescript-api-interface-for-objects | verified | Handbook: interfaces extendable/mergeable/named in errors; type probe: merge OK vs duplicate alias TS2300 |
| typescript-api-iterable-params | verified | Handbook Iterable list + `Iterable<X>` example; probe: Set/generator accepted, Bad throws on Set |
| typescript-api-minimal-surface | verified | Google "Generally minimize the exported API surface"; Bad/Good differ only in leaked internal type |
| typescript-api-modules-over-namespaces | verified | Google "namespaces are disallowed ... use separate files"; note bundler rationale beyond source wording |
| typescript-api-named-exports | verified | Google "Do not use default exports ... no canonical name"; Bad/Good exact |
| typescript-api-no-static-class | verified | Handbook "Why No Static Classes?" with same example; module-scope function is the documented preference |
| typescript-api-options-object | verified | Google Options-interface destructuring + Handbook optional properties; probe defaults `false`/`3` |
| typescript-api-parameter-properties | verified | Google "use a TypeScript parameter property"; snippet mirrors the guide's before/after |
| typescript-api-readonly-fields | verified | Handbook readonly + Google "Use readonly"; compile clean |
| typescript-api-readonly-returns | verified | Handbook ReadonlyArray/`Readonly`; type probe: `push` rejected TS2339 on Good |
| typescript-api-this-return-type | verified | Handbook "this Types"; type probe: subclass method survives chain on Good, lost on Bad |
| typescript-api-union-over-overload | verified | Handbook "prefer parameters with union types instead of overloads"; type probe TS2769 on Bad |
| typescript-sec-error-response-generic | verified | OWASP Error Handling: generic body, details server-side; Bad returns `error.stack` |
| typescript-sec-fetch-credentials | verified | MDN: `include` cross-origin + CSRF vulnerability; default `same-origin`; probe captures options |
| typescript-sec-no-eval | rejected | `enforce: tool` lists `@typescript-eslint/no-implied-eval`, but its page covers only `new Function()`/`setTimeout`/`setInterval`/`setImmediate`/`execScript()` string forms - it does not flag the Bad snippet's direct `eval()` (that is core `no-eval`) |
| typescript-sec-no-innerhtml | verified | MDN XSS/injection-sink warning + `textContent` guidance; OWASP same fix; probe clean |
| typescript-sec-no-merge-untrusted | verified | MDN pollution sources (Object.assign/for...in, `__proto__`, `constructor.prototype`); probe: target prototype hijacked on Bad, clean on Good |
| typescript-sec-no-secrets-in-url | verified | RFC 9110 §17.9 "unwise to include information within a URI that is sensitive"; probe token only in header |
| typescript-sec-no-user-regex | verified | MDN `RegExp.escape`/RegExp; probe: escaped metacharacters match literally; note ReDoS sentence unsourced |
| typescript-sec-postmessage-origin | verified | MDN "always verify the sender's identity using the origin"; probe: hostile origin dropped |
| typescript-sec-postmessage-target | verified | MDN "Always specify an exact target origin, not `*`"; probe: exact origin sent, wildcard on Bad |
| typescript-sec-secrets-from-env | verified | OWASP hardcoded-in-source warning + Node `process.env`; probe: read + missing throws |
| typescript-sec-secure-random | verified | MDN cryptographically strong, entropy-seeded; OWASP secure randomness; probe 32-hex unique |
| typescript-sec-timing-safe-compare | verified | Node constant-time, no timing leak, suitable for secrets, length precondition; probe with real `timingSafeEqual` |
| typescript-sec-tls-only | verified | OWASP TLS confidentiality + "TLS Everywhere"; probe builds `https://` |

## Rejects (left `status: draft`)

1. `typescript-sec-no-eval` - frontmatter `enforce: tool` + `tool: "eslint:@typescript-eslint/no-implied-eval"` overclaims enforcement. The cited typescript-eslint page states the rule "aims to eliminate implied eval() through the use of `new Function()`, `setTimeout()`, `setInterval()`, `setImmediate()` or `execScript()`" and that it "extends the base `no-implied-eval` rule from ESLint core". The Bad snippet is direct `eval(expression)`, which that rule does not report; direct `eval` is covered by core `eslint:no-eval`. Everything else about the rule passes (MDN supports the Why; both snippets compile; Good run maps input to explicit operations). Fix: change `tool` to `eslint:no-eval` for the demonstrated anti-pattern (or use `enforce: both`/a second id if both direct and implied forms are in scope).

## Other checks

- No version numbers in any of the 29 files; `baseline: latest` on all.
- Summary <= 30 words, no hedging; exactly one `## Bad`/`## Good` with a `typescript` fence each; snippets <= 25 lines; no TODO/elisions/Unicode ellipsis.
- All `related` ids (catalog-wide, 1765 ids indexed) and all See Also links resolve with matching target ids; no duplicate or near-duplicate pairs within the batch or against the rest of the pack (cross-language equivalents are permitted by the contract).
- Repo deterministic validator: 0 errors / 0 warnings across the 29 batch files.

## Counts

- Verified: 28/29 (flipped `status: verified`)
- Rejected: 1/29 (left `status: draft`: `typescript-sec-no-eval`)

## Addendum - re-verification of `typescript-sec-no-eval` (2026-10-05)

- Re-verified after the tool fix: `tool: "eslint:no-eval"` now matches the Bad snippet's direct `eval()` (ESLint no-eval page: "Disallow the use of eval()"; "Using eval() on untrusted code can open a program up to several different injection attacks"), `no-implied-eval` retained for the implied-form sentence; both snippets compile clean; flipped `status: draft` -> `status: verified` - final batch: 29/29 verified, 0 rejected.
