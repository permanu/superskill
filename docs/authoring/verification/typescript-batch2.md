# Verification Report - TypeScript Batch 2 (`type` + `async`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/typescript/type-*.md` (16) and `async-*.md` (14) = 30 rules; all entered as `status: draft`
- Toolchain: Node.js v26.8.1, repo-local `tsc` 5.9.3, macOS
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/tsbatch2` (fetched sources, extracted snippets, compile runs, probes, negative probes)

## Method

- Fetched all 31 distinct cited URLs (all HTTP 200) and captured the supporting passages; every claim is checked against its page. One secondary citation does not carry the content its title claims (noted below); its primary source fully carries the rule.
- Extracted both snippets from each rule (60 files) and compiled each independently with the exact baseline command `node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>` from the scratch dir.
- Ran Node probes (5 s guards) for every runtime claim: microtask/ordering, `return await` catch and tick behavior, `void` rejection, `forEach` floating promise, async-iteration cleanup, abort early check, abort listener retention, race cancellation, `AbortSignal.timeout`, rejection reasons, sequential vs parallel latency, promise wrapper, and the runtime failures behind the non-null/any/cast/indexed-access rules.
- Negative compile probes: `--noUncheckedIndexedAccess` and `--exactOptionalPropertyTypes` flag effects, added union member vs `never`, disappearing `@ts-expect-error`, discriminated narrowing, generic constraint rejection, `Function` type rejection, `readonly` argument rejection, `Omit` excess property, and `keyof typeof` with/without `as const`.
- Cross-checked frontmatter/body format, ids, `related` and `## See Also` resolution, keywords, snippet lengths, summary/Why limits, version/hedge/elision/TODO scans, INDEX/directory consistency, and duplicates within the batch, against batch 1 `err`, and against the concurrently authored `test`/`perf` files.
- Repo validator after flips: `node dist/rules/cli.js validate --lang typescript --json` -> 0 errors / 0 warnings, 69 rules checked.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-type-generic-constraint | verified | Generics: "we'd like to constrain this function to work with any and all types that also have the `.length` property". Compile OK. Probe: Good rejects `describeLength(42)` (TS2345), Bad compiles and accepts it. |
| typescript-type-no-non-null-assertion | verified | no-non-null-assertion: "Disallow non-null assertions using the `!` postfix operator"; Everyday Types: "effectively a type assertion that the value isn't `null` or `undefined`". Compile OK. Run: Bad `initials(undefined)` -> TypeError, Good -> `""`. |
| typescript-type-no-function-type | verified | no-unsafe-function-type: "`Function` type allows being called with any number of arguments and returns type `any`". Compile OK. Probe: Good rejects `(x: number) => x` (TS2322), Bad accepts it. |
| typescript-type-discriminated-union-state | verified | Narrowing: "When every type in a union contains a common property with literal types, TypeScript considers that to be a discriminated union, and can narrow out the members". Compile OK. Probe: `state.data` without narrowing fails (TS2339). |
| typescript-type-indexed-access-guard | verified | TSConfig: "Turning on `noUncheckedIndexedAccess` will add `undefined` to any un-declared field in the type"; Object Types index signatures. Compile OK. Flag probe: Bad fails with the flag, Good passes. Run: Bad on `[]` -> TypeError; Good throws its own Error. |
| typescript-type-derive-utility-types | verified | Utility Types: `Omit<Type, Keys>` "Constructs a type by picking all properties from `Type` and then removing `Keys`" (same page: Pick, Partial). Compile OK. Probe: `PublicUser` rejects `passwordHash` (TS2353). |
| typescript-type-no-ts-ignore | verified | ban-ts-comment defaults: `'ts-expect-error': 'allow-with-description'`, `'ts-ignore': true`; "@ts-expect-error is allowed when it includes a description". Both snippets compile by design. Probe: with the violation removed, Good fails (TS2578 unused `@ts-expect-error`) while Bad compiles - the expectation is load-bearing and reads correctly. |
| typescript-type-no-wrapper-types | verified | no-wrapper-object-types: "Disallow using confusing built-in primitive class wrappers ... only the lowercase variant is appropriate". Compile OK. |
| typescript-type-no-empty-object | verified | no-empty-object-type: "`{}` represents any non-nullish value, including literals like `0` and `""`". Compile OK. |
| typescript-type-const-assertion | **rejected** | Why/title claim keys widen without `as const` - false. Probe without `as const`: `keyof typeof routes` is already `"home" \| "user"` (assigning `"nope"` fails TS2322), and the Good snippet compiles identically without `as const`; the cited Everyday Types page says only that "all properties are assigned the literal type" (values). Fix: values widen to `string`; keys stay literal; state that `as const` preserves literal value types/readonly and that `keyof typeof` works either way. |
| typescript-type-unsafe-cast | verified | no-unsafe-type-assertion: "Disallow type assertions that narrow a type". Compile OK. Run: Bad on `string[]` -> TypeError; Good joins. |
| typescript-type-generic-necessity | verified | no-unnecessary-type-parameters: "If a type parameter is only used once, then it is not relating anything ... can be used to disguise unsafe type assertions". Compile OK. |
| typescript-type-optional-not-undefined | verified | exactOptionalPropertyTypes: "`colorThemeOverride: undefined` is not the same as `colorThemeOverride` not being defined ... `"colorThemeOverride" in settings` would have different behavior". Compile OK. Flag probe: Bad fails with the flag, Good passes. Run: `'theme' in {theme: undefined}` true vs `{}` false. |
| typescript-type-no-explicit-any | verified | no-explicit-any: "The `any` type ... is a dangerous 'escape hatch' ... disables many type checking rules"; Everyday Types `unknown`. Compile OK. Run: Bad on a string -> TypeError; Good throws a named Error. |
| typescript-type-readonly-inputs | verified | Object Types: "The `ReadonlyArray` is a special type that describes arrays that shouldn't be changed"; Utility Types `Readonly`. Compile OK. Probe: Bad rejects `readonly number[]` (TS2345), Good accepts. |
| typescript-type-exhaustive-union | verified | Narrowing: "no type is assignable to `never` ... you can use narrowing and rely on `never` turning up to do exhaustive checking in a `switch` statement". Compile OK. Probe: adding a member makes Good fail at the `never` assignment; Bad stays silent (returns 0). |
| typescript-async-abort-early-check | verified | AbortSignal: "`throwIfAborted()` Throws the signal's abort reason if the signal has been aborted". Compile OK. Run: items handled `[1, 2]`, then AbortError before item 3. |
| typescript-async-abort-listener-cleanup | verified | AbortSignal: "Remove the abort listener when the operation completes normally, so a long-lived signal does not retain the listener and the values it references. Again, `{ once: true }` only removes the listener if the signal actually aborts". Compile OK. Run: retained listener fired on a later abort; the `finally`-removed one did not. |
| typescript-async-async-iteration | verified | for await...of: "If the `for await...of` loop exited early ... the `return()` method of the iterator is called to perform any cleanup". Compile OK. Run: early `break` -> total 3 and `return()` cleanup ran. |
| typescript-async-await-thenable | verified | await-thenable: "If the `await` keyword is used on a value that is not a Thenable, the value is directly resolved, but will still pause execution until the next microtask". Compile OK. Run: ordering `sync -> after-await-null -> queueMicrotask -> setTimeout0`. |
| typescript-async-fetch-status-check | verified | Using Fetch: "will reject the promise on some errors, but not if the server responds with an error status like 404: so we also check the response status and throw if it is not OK". Compile OK. Fetch run skipped (network-dependent, per brief). |
| typescript-async-microtask-defer | verified | Microtask guide: a `setTimeout()` callback is "added to the task queue"; `queueMicrotask` runs "after the function or program which created it exits and only if the JavaScript execution stack is empty". Compile OK. Run: `queueMicrotask` ran before `setTimeout(0)`. Note: second citation (MDN Promise, "task queues vs. microtasks") does not carry microtask content - see follow-ups. |
| typescript-async-no-misused-promises | verified | no-misused-promises: "Disallow Promises in places not designed to handle them ... due to a missing `await` keyword". Compile OK. Run: `saveAll` returned before any save completed ([] then later [1,2,3]). |
| typescript-async-no-void-silence | verified | no-floating-promises: "Voiding a Promise doesn't handle it or change the runtime behavior ... Such Promise rejections will still be unhandled"; Node process `'unhandledRejection'`: "emitted whenever a Promise is rejected and no error handler is attached". Compile OK. Run: void'd rejection surfaced as `unhandledRejection`; handled version caught it. |
| typescript-async-parallelize-independent | verified | Using promises: "it's always better to run promises concurrently so that they don't unnecessarily block each other". Compile OK. Run: sequential 253 ms vs `Promise.all` 152 ms (100 ms + 150 ms delays). |
| typescript-async-promise-constructor | verified | Using promises: "A Promise can be created from scratch using its constructor. This should be needed only to wrap old APIs". Compile OK. Run: Good returns `"data"` after the wrapper resolves. |
| typescript-async-promise-reject-error | verified | prefer-promise-reject-errors: "Require using Error objects as Promise rejection reasons" (`Promise.reject('error')` shown incorrect). Compile OK. Run: Error reason is `instanceof Error` with a stack; string has neither. |
| typescript-async-race-cancel | verified | Promise: "`Promise.race()` Settles when any of the promises settles"; AbortSignal cancellation. Compile OK. Run: without abort the losing slow operation finished after the race; with abort in `finally` the loser was stopped (`slow-aborted`). Note: non-cancellation is standard semantics, not verbatim on the Promise page. |
| typescript-async-return-await | **rejected** | Policy matches the `in-try-catch` default (docs: `const defaultOptions : Options = 'in-try-catch'`; example "Doesn't execute due to missing await"), but the Why's "outside error-handling contexts the extra await only adds a microtask tick" is contradicted by the cited page ("Contrary to popular belief, `return await promise;` is at least as fast as directly returning the promise"; "Returning an awaited promise improves stack trace information") and by measurement: on Node 26.8.1 `return await p` settled/rejected one tick before `return p`. The stack-trace rationale is absent. Fix the Why. |
| typescript-async-timeout-signal | verified | AbortSignal: "`AbortSignal.timeout()` ... will automatically abort after a specified time ... the `fetch()` promise rejects with a `TimeoutError` DOMException". Compile OK. Run: signal aborted at 51 ms with reason `TimeoutError`; fetch run skipped (network-dependent, per brief). |

## Cross-cutting checks

- Sources: all 31 distinct URLs fetched 200 and support their claims, except the redundant second citation of `async-microtask-defer` (see follow-ups); `async-race-cancel`'s non-cancellation sentence is standard semantics rather than a quote.
- Compile: 60/60 snippets pass the exact harness command (tsc 5.9.3). Longest snippet 16 lines.
- Behavior: all probes confirm their claims; the two fetch-dependent cases were skipped with the stated reason.
- Tool ids: the `tsc:<flag>` form is consistent with verified batch-1 `err-catch-unknown` (`tsc:useUnknownInCatchVariables`, `enforce: both`): `tsc:noUncheckedIndexedAccess` and `tsc:exactOptionalPropertyTypes`, both `enforce: both`, and both flags demonstrably change the compile outcome in the probes. All `eslint:@typescript-eslint/*` ids exist on their fetched pages.
- Formatting: validator reports 0 errors / 0 warnings; summaries <= 17 words, Why 2 sentences, snippets <= 16 lines, keywords 4-5, `## See Also` present, `related` and See Also links resolve, no version tokens, hedges, TODOs, or elisions.
- Duplicates: no duplicates within the batch, against batch 1 `err`, or against the concurrently authored `test`/`perf` files (closest pairs are distinct decisions: `await-thenable`/`return-await`, `no-void-silence`/`no-misused-promises`, `abort-early-check`/`abort-listener-cleanup`, `discriminated-union-state`/`exhaustive-union`, `generic-constraint`/`generic-necessity`).
- Concurrency: a `test`/`perf` batch was being authored during this verification (mtimes 00:42-00:47); the 30 files in scope were unchanged (mtimes 00:27-00:30) and their only edits here are the 28 status flips. The latest validator run (98 rules, concurrent batches included) reports no issues in these 30; the single warning belongs to an out-of-scope `api-*` file.

## Notes / follow-ups (outside verifier ownership)

- `type-const-assertion` stays `draft`: the keys-widening rationale is false and the Good snippet compiles without `as const`; reword the Why around value widening and literal value types, then re-verify.
- `async-return-await` stays `draft`: drop the microtask-tick cost claim (contradicted by the cited page and by measurement) and state the stack-trace rationale the page documents; the `in-try-catch` policy itself is correct, then re-verify.
- `async-microtask-defer`: the second citation (MDN Promise, "task queues vs. microtasks") has no microtask content; the Microtask guide carries the claim. Fix or drop the citation.
- `async-race-cancel`: "race does not cancel the losers" is not stated on the Promise page; the AbortSignal page backs the remedy. Optional wording note.
- `INDEX.md` says `verified: 0` and describes all batches as draft; stale after these 28 flips (owner update, as with batch 1).

## Counts

- Verified: 28/30 (15 `type`, 13 `async`)
- Rejected: 2 (`typescript-type-const-assertion`, `typescript-async-return-await`)
- Blockers: none for the verified set; two Why fixes required before the rejected pair can ship.

## Addendum - Re-verification of the 2 rewritten rules (2026-10-05)

- Re-verifier: independent adversarial subagent (fresh context; did not author these rules or the original report)
- Scope: `typescript-type-const-assertion`, `typescript-async-return-await` - re-checked after the rewrite requested above
- Toolchain: Node.js v26.8.1, repo-local tsc 5.9.3, macOS
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/tsrecheck`
- Sources re-fetched (HTTP 200): Everyday Types, Object Types, typescript-eslint return-await, MDN Using promises

### Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-type-const-assertion | verified | Everyday Types: "The as const suffix acts like const but for the type system, ensuring that all properties are assigned the literal type instead of a more general version like string or number"; Object Types: "array literals with const assertions will be inferred with readonly tuple types" and "writing to any property of a readonly tuple isn't allowed". Compile: both snippets clean. Type probes: Bad `RoutePath` is `string` (type-level Equal check), `keyof typeof routes` is `"home" \| "user"` in both forms, `link("nope")` accepted by Bad / TS2345 under Good, `(typeof routes)["home"]` accepts `"/anything"` in Bad, `routes.home = "/changed"` compiles in Bad and is TS2540 under Good. Keys-stay-literal, values-widen, value-union demonstration, and readonly claims all hold; the false keys-widening rationale is gone. |
| typescript-async-return-await | verified | return-await page: "Returning an awaited promise improves stack trace information"; "When the return statement is in try...catch, awaiting the promise allows the promise's rejection to be caught instead of leaving the error to the caller"; "Contrary to popular belief, return await promise; is at least as fast as directly returning the promise"; `const defaultOptions: Options = 'in-try-catch'`; incorrect-example comment "Doesn't execute due to missing await"; ordinary-context guidance "prefer the shorter return promise form ... wherever it's safe to use". The microtask-tick claim is gone; the Why now states control-flow correctness, the stack-trace benefit, and stylistic consistency outside error handling. Compile: both snippets clean. Runtime probe: `try { return await Promise.reject(...) } catch` -> `"caught"`; the direct-return form rejects to the caller. Finally-timing probe: `finally` runs in both forms, immediately (0 ms) for the direct return and after settlement (31 ms) for `return await`; the Why's "catch and finally run as written" tracks the page's "trigger subsequent catch or finally blocks as expected" - noted, not blocking. |

### Counts

- Re-verified: 2/2, both flipped `status: draft` -> `status: verified`
- Batch 2 final: 30/30 verified, 0 rejected
- Post-flip repo validator: `node dist/rules/cli.js validate --lang typescript --json` -> 0 errors / 0 warnings, 98 rules checked
