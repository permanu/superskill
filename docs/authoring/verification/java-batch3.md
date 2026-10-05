# Java Batch 3 (`api` + `test`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/api-*.md` (12) and `test-*.md` (13) — 25 rules
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew arm64); JUnit Jupiter 6.1.3 (`junit-jupiter-api`, `junit-jupiter-params`) and `junit-platform-console-standalone` 6.1.3 from Maven Central; JDK 23 runtime
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-java-batch3/` (`docs/` fetched pages, `jars/`, `src/`, `classes/`, `run/`)

## Method

1. Sources: fetched all 22 unique cited URLs — every one returned HTTP 200. Claim-level passages matched against the saved pages:
   - Error Prone `CheckReturnValue` ("When code calls a non-void method, it should usually use the value that the method returns."; `concat` no-op example) and `EmptyCatch` ("prefer using `Assert.assertThrows` instead of writing a try-catch").
   - Comparable consistency quotes incl. the prescribed "natural ordering that is inconsistent with equals" wording; Object equals/hashCode API note, toString default format, and finalize alternative-cleanup text; FunctionalInterface "compilers are required to generate an error message unless"; List "Unmodifiable Lists" + `UnsupportedOperationException`; Serializable "strongly recommended… default serialVersionUID computation is highly sensitive…"; Clock "Best practice for applications is to pass a Clock into any method…"; JEP 126 evolution/compatibility quotes.
   - Javadoc doc-comment spec (javase/26): "The first sentence of deprecated text should tell the user when the API was deprecated and what to use as a replacement." and "In Markdown documentation comments, the @Deprecated annotation must be used…".
   - Google Java Style 6.1 ("A method is marked with the @Override annotation whenever it is legal."), 6.4 ("Do not override Object.finalize"), 5.2.2 (XTest convention, underscores in test names).
   - JUnit 6.1.3 canonical pages (`docs.junit.org/6.1.3/writing-tests/...`): assertions (grouped failures; lazy Supplier), exception-handling, disabling-tests, dynamic-tests, nested-tests, test-execution-order, parameterized, tagging-and-filtering, built-in-extensions (TempDirectory), timeouts. All `test-*` citations use these working URLs; no rule cites the old 404-ing `junit.org/junit5` subpages.
2. Compile: extracted both snippets from all 25 rules (50 snippets, all declaration-level, no `public` top-level types) and compiled each independently: `javac 23.0.2 -Xlint:all -cp <jupiter-api:jupiter-params:console-standalone> -d classes/<rule>/<Bad|Good>` without `--enable-preview` — **50/50 compiled**. A representative `test-parameterized` snippet also compiles with only the two Jupiter jars (apiguardian warnings only).
3. Behavior: 13 positive JUnit console runs (all pass): assert-all 1/1, parameterized 3/3, tempdir 1/1, timeout 1/1, inject-clock 1/1, dynamic-tests 4/4, assert-throws 1/1, nested 1/1, no-order-dependency 1/1, naming 1/1, disabled-reason 1 skipped with reason shown, tags 1/1, assert-message-lazy 1/1. Negatives/harnesses:
   - `@Timeout(1)` + 5s sleep fails at 1053 ms with `TimeoutException: timed out after 1 second`.
   - `assertAll` reports both failures (`MultipleFailuresError: point (2 failures)`) vs a sequential test reporting only the first.
   - `--exclude-tag integration` discovers 0 tests; `CartTest#keepsItem` alone on the Bad snippet fails (`expected: <1> but was: <0>`); a Supplier message is not evaluated when the assertion passes (counter stays 0).
   - API harnesses: HashSet `contains` false→true; TreeSet size 1→2 for compareTo-inconsistent versions; `members().add(...)` mutates (Bad) vs `UnsupportedOperationException` (Good); `strip()` ignored prints raw text vs stripped; default `Money@2a139a55` vs `Money[cents=150]`; `serialver` computed UID `-2168945552689024059L` vs explicit `1L`.
   - Negative compiles: two abstract methods under `@FunctionalInterface` → "not a functional interface"; drifted signature with `@Override` → "method does not override"; implementor missing a newly added abstract method → "not abstract and does not override abstract method"; `finalize` override emits `[removal] finalize() … deprecated and marked for removal`.
4. Idiom: both snippets reviewed per rule — Good is principal-level current-LTS Java (records, pattern `instanceof`, `List.copyOf`, `Objects.hash`, `Clock.fixed`, `@TempDir`, `assertThrows`), Bad is genuinely the claimed anti-pattern. No preview syntax or preview APIs (all compiles are non-preview; no rule mentions preview).
5. Structural/consistency: exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `java` fence per section, summaries ≤30 words (max 18), all `related` ids and See Also links resolve, INDEX lists all 25 files, no TODO/FIXME/TBD/ellipsis/elisions. Duplicates: max within-batch title+summary similarity 0.20; no cross-batch similarity >0.5. Adjacent pairs (`dynamic-tests`/`parameterized`, `nested`/`no-order-dependency`, `tags`/`disabled-reason`, `assert-all`/`assert-message-lazy`) are distinct decisions and cross-linked.
6. Tool ids: Error Prone `CheckReturnValue` and `EmptyCatch` bugpattern pages confirmed (HTTP 200, claims supported). No rule sets `enforce: tool`, so no tool id is required; the two Error Prone citations are source support while `enforce: review`, and neither claims linter enforcement.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-api-check-return-value | verified | CheckReturnValue page exact quotes; 50/50 compile; harness prints raw `  x  ` (Bad) vs `x` (Good) |
| java-api-comparable-consistent | verified | Comparable quotes incl. prescribed inconsistency wording; TreeSet Bad add 1.1=false size=1, Good size=2 |
| java-api-default-method-evolution | verified | JEP 126 "source and binary compatible" quotes; negative compile: implementor missing new abstract method fails |
| java-api-deprecate-with-replacement | verified | Javadoc spec quotes (first sentence; Markdown annotation requirement); `javadoc -package` renders Deprecated + `newName()` link |
| java-api-equals-hashcode | verified | Object API note exact; HashSet contains equal user false→true |
| java-api-functional-interface | verified | API "compilers are required to generate an error message unless"; negative compile → "not a functional interface" |
| java-api-immutable-exposure | verified | List "Unmodifiable Lists" + UOE quote; Bad caller mutated size=2, Good UOE |
| java-api-interface-first | verified | Tutorial decision-list quotes; compile OK; hedging warnings are direct quotations |
| java-api-no-finalize | rejected | `lang: api` in frontmatter (must be `java`, CONTRACT §3). Everything else passes: Object finalize cleanup quotes + Google 6.4 "Do not override Object.finalize"; compile OK with `[removal]` warning |
| java-api-override-annotation | verified | Google 6.1 exact quote; negative compile drift → "method does not override" |
| java-api-serialversionuid | verified | Serializable quotes; `serialver` computed UID vs explicit `1L`. Minor: rule quotes "strongly recommends", page says "strongly recommended" |
| java-api-tostring | verified | Object toString format + "recommended that all subclasses override" quotes; `Money@2a139a55` vs `Money[cents=150]` |
| java-test-assert-all | verified | assertions page grouped-failure quote; assertAll harness reports 2 failures, sequential reports 1; run 1/1 |
| java-test-assert-message-lazy | verified | assertions page lazy Supplier quotes; supplier not evaluated on pass; run 1/1 |
| java-test-assert-throws | verified | exception-handling quotes; EmptyCatch page recommends assertThrows over try/fail/catch; run 1/1 |
| java-test-disabled-reason | verified | disabling-tests exact recommendation; run: 1 skipped, reason displayed in tree |
| java-test-dynamic-tests | verified | dynamic-tests quotes; run: 4 dynamic tests pass |
| java-test-inject-clock | verified | Clock "Best practice…" quote; run 1/1. Note: Good injects the Instant derived from `Clock.fixed` rather than the Clock object |
| java-test-naming | verified | Google 5.2.2 XTest/underscore quotes; run 1/1 |
| java-test-nested | verified | nested-tests quotes; run 1/1 |
| java-test-no-order-dependency | verified | execution-order quotes; Bad `keepsItem` alone fails expected 1 but was 0; Good run 1/1 |
| java-test-parameterized | verified | parameterized quotes; run: 3 invocations pass |
| java-test-tags | verified | tagging-and-filtering quotes; `--exclude-tag integration` → 0 tests found; run 1/1 |
| java-test-tempdir | verified | built-in-extensions TempDirectory quote; @TempDir injection run 1/1 |
| java-test-timeout | verified | timeouts quotes; negative @Timeout(1) vs 5s sleep fails at 1053 ms; run 1/1 |

## Counts

- **verified: 24/25, rejected: 1**
- Compile: 50/50 snippets (javac 23.0.2, non-preview). Behavior: 13/13 positive JUnit runs pass; 4 negative JUnit harnesses and 5 API behavior harnesses reproduce the claimed outcomes; 3 negative compile probes confirm the claimed compiler errors.
- Duplicates: none (max within-batch similarity 0.20, no cross-batch >0.5). Formatting, section order, related/See Also links, INDEX coverage, and canonical JUnit URLs all pass.

## Blockers and follow-ups

- Blocker: `catalog/rules/java/api-no-finalize.md` stays `draft` — frontmatter `lang: api` must be `java` (CONTRACT §3 enum). One-word fix, then it can be re-verified quickly; all substantive checks for that rule pass.
- Minor observations, not grounds for rejection: `api-serialversionuid` quotes "strongly recommends" where the page says "strongly recommended"; `test-inject-clock` Good injects the derived `Instant` rather than the `Clock` object its title names; `api-check-return-value` title uses "often" (hedge-level warning; summary is clean).
- The other 24 files were flipped `draft` → `verified`; no other content was touched. `catalog/rules/java/INDEX.md` still shows `Rules: 71 (verified: 46)`; index/status counts are outside the verifier's ownership and left to the orchestrator (expected after this report: 70 verified, 1 draft).

## Addendum (2026-10-05)

- `api-no-finalize.md` `lang: api` → `lang: java` fixed by the author; re-checked (frontmatter valid, both snippets re-extracted and re-compiled 2/2 with the expected `[removal]` warning, sources/links unchanged) and flipped to `verified`. Final count: **verified 25/25, rejected 0** (expected INDEX count after orchestrator sync: 71 verified).
