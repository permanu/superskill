# Verification Report - TypeScript Batch 3 (`test`, `perf`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `test-*.md` + 12 `perf-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Node v26.8.1; TypeScript 5.9.3 (`node /Users/arvee/Documents/superskill/node_modules/typescript/bin/tsc`)
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/tsbatch3` (snippets, tsc outputs, probes)

## Method

1. Fetched every distinct cited URL (20 total: Node test/assert/errors docs, Testing Library guiding principles, MDN Map/Set/some/sort/RegExp/Typed arrays/structuredClone/Performance.now/requestAnimationFrame/Worker/Using promises, TypeScript Handbook Classes, TSConfig strict, typescript-eslint no-unsafe-type-assertion and no-floating-promises, web.dev layout thrashing). All resolved and were read for the claim-specific passages quoted below.
2. Extracted both fenced snippets from each rule (48) and compiled each with the exact harness command.
3. Ran bounded Node probes for runner semantics (`context.plan` tracking, `test.only`, `context.waitFor` condition semantics and timeout error, floating rejection) and for library behavior (default vs comparator sort, structuredClone vs JSON, memoize, some/filter call counts, Set/Map/RegExp/typed-array equivalence, throwing helper, performance.now).
4. Mechanical lint: frontmatter fields, `status`/`baseline`, summary word count and hedging, one `## Bad`/`## Good` with a `typescript` fence each, anti-slop tokens/elisions, snippet line cap, `related` and See Also resolution, version-number scan, near-duplicate scan across the pack.

## Source evidence (claim-specific)

- `test-public-api`: Testing Library Guiding Principles - "it should deal with DOM nodes rather than component instances, and it should not encourage dealing with component instances"; TS Handbook Classes - `private` is not accessible outside the class (and is only enforced during type checking, which is exactly the escape the Bad snippet uses).
- `test-plan-assertions`: Node `context.plan(count)` - "sets the number of assertions and subtests that are expected to run ... If the number ... does not match the expected count, the test will fail"; the docs note "To make sure assertions are tracked, `t.assert` must be used instead of `assert` directly". REJECT: the Good snippet plans 1 but calls a declared helper with no access to `t.assert`; probe shows that exact pattern fails even on success: `'plan expected 1 assertions but received 0'`.
- `test-wait-for`: Node `context.waitFor(condition)` - condition is "invoked periodically until it completes successfully ... Successful completion is defined as not throwing or rejecting"; the return value is ignored. REJECT: the declared shape `waitFor(condition: () => boolean)` polls "until it holds", which is not the documented API; probe `t.waitFor(() => false)` resolved in 1 ms on the first call. The Why's "fails with the condition itself named" is also unsupported: the timeout error is exactly `waitFor() timed out`.
- `test-assert-helper-throws`: Node assert - assertion functions verify invariants and throw `AssertionError`; Node errors - "Any use of the JavaScript `throw` mechanism will raise an exception that must be handled".
- `test-injected-clock`: Node test "Dates" - `context.mock.timers.enable({ apis: ['Date'], now: 100 })` and `timers.setTime(...)`; MDN Performance.now - monotonic clock. Note: the docs demonstrate global Date mocking rather than dependency injection; the rule's recommendation is standard test practice and is not contradicted.
- `test-skip-reason`: Node `test` options - "`skip` ... If a string is provided, that string is displayed in the test results as the reason for skipping the test."
- `test-isolated-state`: Node "Test runner execution model" - with isolation disabled "it is possible for tests to interact with each other ... state ... modified by a test originating from another file"; `--test-randomize` exists "to help detect order-dependent tests". The per-test-state claim stays within the documented model.
- `test-assert-rejects`: Node `assert.rejects` - "It will then check that the promise is rejected", with `error` able to be a Class, RegExp, or validation function.
- `test-typed-fixtures`: typescript-eslint `no-unsafe-type-assertion` - "forbids using type assertions to narrow a type, as this bypasses TypeScript's type-checking" (the Bad `Partial<User>` -> `User` cast is exactly such a narrowing); TSConfig `strict` - "stronger guarantees of program correctness".
- `test-no-focus`: Node "`only` tests" - "it is possible to skip all tests except for a selected subset by passing the `only` option"; "Tests that are not executed are omitted from the test runner output". Note: Node scopes this to `--test-only` or disabled isolation; probe: `node --test` (default isolation, no flag) ran both tests, while direct run and `--test-only` ran only the focused test. Committed focus markers remain a hazard in the documented modes and common runners.
- `test-await-async`: Node test - a function returning a Promise is "considered failing if the Promise rejects"; "Extraneous asynchronous activity" - the rejection surfaces as `unhandledRejection` ("would have caused the test to fail, but instead triggered an unhandledRejection event"); typescript-eslint `no-floating-promises` - "Floating Promises can cause several issues, such as improperly sequenced operations, ignored Promise rejections". Probe: floating rejection left the test verdict `pass` and exited 1 with a top-level diagnostic, i.e. reported after the verdict.
- `test-mock-restore`: Node `mock.reset()`/`timers.reset()` - "After each test completes, this function is called on the test context's `MockTracker`. If the global `MockTracker` is used extensively, calling this function manually is recommended." Note: the runner auto-resets test-context mocks/timers; the rule's Bad/Good use a custom clock, for which the leak claim holds, and the docs recommend the manual reset the rule teaches for the global tracker.
- `perf-measure-first`: MDN Performance.now - "not limited to one-millisecond resolution ... up to microsecond precision"; "relative to the `timeOrigin` property which is a monotonic clock"; "`Date.now()` may have been impacted by system and user clock adjustments".
- `perf-map-churn`: MDN Map - Map "Performs better in scenarios involving frequent additions and removals of key-value pairs", Object "Not optimized"; Map "does not contain any keys by default" and exposes `size`.
- `perf-batch-dom-io`: web.dev layout thrashing - the exact `paragraphs[i].style.width = box.offsetWidth` read-write loop and its fix; "always batch your style reads and do them first ... and then do any writes".
- `perf-memoize-pure`: MDN Map - the spec requires "access times that are sublinear on the number of elements in the collection". The purity/bounded-input precondition is definitional to memoization.
- `perf-early-exit`: MDN `some()` - "until the `callbackFn` returns a truthy value. If such an element is found, `some()` immediately returns `true` and stops iterating"; the intermediate-array claim matches documented `filter` behavior.
- `perf-sort-comparator`: MDN `sort()` - default order is "built upon converting the elements into strings, then comparing their sequences of UTF-16 code unit values"; the page's own example is `[1, 30, 4, 21, 100000]` -> `[1, 100000, 21, 30, 4]`.
- `perf-worker-offload`: MDN Worker - "represents a background task that can be created via script, which can send messages back to its creator"; `Worker.postMessage()` "Sends a message ... to the worker's inner scope".
- `perf-regexp-hoist`: MDN RegExp - "The literal notation results in compilation of the regular expression when the expression is evaluated. On the other hand, the constructor ... results in runtime compilation".
- `perf-typed-arrays`: MDN Typed arrays - typed arrays "provide a mechanism for reading and writing raw binary data in memory buffers"; "Each entry ... is a raw binary value in one of a number of supported formats"; useful for platform features. Note: "plain array stores references to boxed values" is a simplification (engines may store number arrays unboxed); the recommendation rests on the guide's binary-data framing, is `should`/review, and claims no benchmark.
- `perf-structured-clone`: MDN structuredClone - "creates a deep clone of a value using the structured clone algorithm" and "supports circular references". The JSON comparison was verified empirically (below), not from this page.
- `perf-set-membership`: MDN Set "Performance" - `has` "is, on average, faster than the `Array.prototype.includes` method when an array has a `length` equal to a set's `size`".
- `perf-raf-batch`: MDN requestAnimationFrame - "call a user-supplied callback function before the next repaint"; "calls are paused in most browsers when running in background tabs or hidden iframes".

## Compile results

48/48 snippets compile with the exact harness command (24 rules x Bad/Good), zero diagnostics, TypeScript 5.9.3. The Bad snippets that demonstrate anti-patterns are valid TS by construction (casts, default sort, unawaited promises), so they compile as expected.

## Behavior probe results (Node v26.8.1, bounded)

- sort: default `[1,100000,21,30,4]`; comparator `[1,4,21,30,100000]` - matches `perf-sort-comparator` exactly.
- structuredClone: circular ref preserved (`clone.itself === clone`), Date stays a Date, Map stays a Map, `undefined` key kept; JSON round-trip stringifies the Date, empties the Map (`{}`), drops the `undefined` key, and throws `TypeError` on the circular object - matches `perf-structured-clone`.
- memoize: two calls with the same input computed once, equal results.
- early exit: `some` invoked the predicate once, `filter` three times, same answer.
- Set/Map/RegExp/typed-array Bad vs Good variants produce identical results on sample inputs.
- throwing helper: `assertSorted([3,1])` throws `values are not sorted at index 1`; sorted input passes.
- `performance.now()` works and returns a finite non-negative delta.
- runner probes: `t.plan(1)` + custom throwing helper that succeeds -> test fails `'plan expected 1 assertions but received 0'`; `t.waitFor(() => false)` resolves on the first call; `t.waitFor` timeout error is `waitFor() timed out`; floating rejection leaves test verdict `pass` and process exit 1 with an `unhandledRejection` diagnostic; `.only` skips others on direct run and with `--test-only`, but `node --test` default runs both.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-test-public-api | verified | TL Guiding Principles + TS Handbook `private`; snippets compile; practice scoped to testing |
| typescript-test-plan-assertions | rejected | Good pattern fails under cited runner: probe `'plan expected 1 assertions but received 0'`; docs require `t.assert` for plan tracking |
| typescript-test-wait-for | rejected | declared `() => boolean` condition contradicts `context.waitFor` semantics (probe: resolves in 1 ms on first call); "condition named" claim unsupported (error: `waitFor() timed out`) |
| typescript-test-assert-helper-throws | verified | Node assert/errors docs; helper throws `Error` naming the violated condition; snippets compile |
| typescript-test-injected-clock | verified | Node Dates mocking + MDN monotonic clock; DI recommendation standard and uncontradicted |
| typescript-test-skip-reason | verified | docs: string `skip` "displayed in the test results as the reason"; exact API shape |
| typescript-test-isolated-state | verified | execution-model and randomization passages support order-dependence claim |
| typescript-test-assert-rejects | verified | `assert.rejects` checks rejection and can match error type/code/message |
| typescript-test-typed-fixtures | verified | `no-unsafe-type-assertion` forbids narrowing assertions; `strict`; defaults-filled factory is idiomatic |
| typescript-test-no-focus | verified | docs describe `only` omitting other tests; note the `--test-only`/isolation condition (probe evidence) |
| typescript-test-await-async | verified | Node promise test model + `no-floating-promises`; probe shows rejection escapes the verdict (diagnostic after pass, exit 1) |
| typescript-test-mock-restore | verified | docs recommend manual reset for global tracker; custom-clock Bad/Good valid; note auto-reset for context tracker |
| typescript-perf-measure-first | verified | MDN Performance.now: sub-millisecond, monotonic, vs Date.now clock adjustments |
| typescript-perf-map-churn | verified | MDN Map performance/accidental-keys/size rows |
| typescript-perf-batch-dom-io | verified | web.dev article contains the exact read/write loop and its fix |
| typescript-perf-memoize-pure | verified | MDN Map sublinear access; purity/bounded precondition definitional |
| typescript-perf-early-exit | verified | MDN `some` stops at first truthy; probe call counts |
| typescript-perf-sort-comparator | verified | MDN `sort` default string/UTF-16 comparison; page's exact example reproduced |
| typescript-perf-worker-offload | verified | MDN Worker background-task/message model |
| typescript-perf-regexp-hoist | verified | MDN RegExp literal-vs-constructor compilation wording |
| typescript-perf-typed-arrays | verified | MDN typed-arrays binary-data framing; note the "boxed values" simplification; should/review, no benchmark claimed |
| typescript-perf-structured-clone | verified | MDN structuredClone deep clone + circular refs; JSON losses confirmed by probe |
| typescript-perf-set-membership | verified | MDN Set Performance: `has` faster than `includes` at equal size |
| typescript-perf-raf-batch | verified | MDN rAF before-repaint and background-tab pausing |

## Rejects (left `status: draft`)

1. `typescript-test-plan-assertions` - the Good snippet declares `expectRejection(value: string): void` with no access to `t.assert`, then calls `t.plan(1)`. Node documents that plan only tracks assertions made through `t.assert`; the probe reproduced the failure on the success path (`plan expected 1 assertions but received 0`). Fix would be `t.assert.rejects(...)` (or passing `t` into the helper), not the declared shape.
2. `typescript-test-wait-for` - the declared `waitFor(condition: () => boolean)` does not mirror `context.waitFor`, whose condition is an assertion function that succeeds by not throwing and whose return value is ignored; probe `t.waitFor(() => false)` resolved immediately on the first call, so the snippet would not wait. The Why's "fails with the condition itself named" is not in the docs and the observed timeout error is `waitFor() timed out`.

## Other checks

- No version numbers in any of the 24 files.
- Summary <= 30 words, no hedging; one `## Bad`/`## Good` with a `typescript` fence each; no TODO/elisions; snippets <= 25 lines.
- All `related` IDs and See Also links resolve; no duplicates or near-duplicates within the pack (cross-language equivalents are permitted by the contract).
- Deterministic validator was not re-run for this batch (verifier used the mandated compile harness directly); the structural checks above mirror its rule-level checks.

## Counts

- Verified: 22/24 (flipped `status: verified`)
- Rejected: 2/24 (left `status: draft`: `typescript-test-plan-assertions`, `typescript-test-wait-for`)

## Addendum - Re-verification of the 2 rewritten rules (2026-10-05)

- Re-verifier: independent adversarial subagent (fresh context; did not author these rules or the original report)
- Scope: `typescript-test-plan-assertions`, `typescript-test-wait-for` - re-checked after the rewrite requested above
- Toolchain: Node.js v26.8.1, repo-local tsc 5.9.3, macOS
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/tsrecheck`
- Source re-fetched: Node.js test runner docs (quotes below from the fetched page)

### Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-test-plan-assertions | verified | Node docs: "sets the number of assertions and subtests that are expected to run ... If the number of assertions and subtests that run does not match the expected count, the test will fail"; "To make sure assertions are tracked, t.assert must be used instead of assert directly". Compile: both snippets clean. Probes (`node --test`): Good pattern `t.plan(1)` + `await t.assert.rejects(save(""))` -> pass; Bad pattern (declared helper with no access to `t.assert`) -> fail `'plan expected 1 assertions but received 0'`; a no-assertion test -> pass, confirming the silent-pass premise. The Why's "plan only counts assertions made through the context's own assert" matches both the docs and the probe. |
| typescript-test-wait-for | verified | Node docs: condition is "An assertion function that is invoked periodically until it completes successfully or the defined polling timeout elapses. Successful completion is defined as not throwing or rejecting. This function does not accept any arguments, and is allowed to return any value." Compile: both snippets clean; the declared `() => void` shape matches "allowed to return any value" and the throwing `assertReady()` callback. Probes (`node --test`): `await t.waitFor(() => { assertReady(); })` with readiness after 120 ms -> pass after 4 polls (~153 ms); always-throwing condition with a 150 ms timeout -> fail `Error: waitFor() timed out` (cause: the thrown error); non-throwing `() => false` -> pass on the first call (poll count 1), confirming success is not a truthy return. The Why matches the documented contract; the unsupported "condition named in the error" claim is gone. |

### Counts

- Re-verified: 2/2, both flipped `status: draft` -> `status: verified`
- Batch 3 final: 24/24 verified, 0 rejected
- Post-flip repo validator: `node dist/rules/cli.js validate --lang typescript --json` -> 0 errors / 0 warnings, 98 rules checked
