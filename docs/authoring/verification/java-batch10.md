# Java Batch 10 (`lint` + `async`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/lint-*.md` (12) and `async-*.md` (13) — 25 rules
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew arm64); JDK 23 runtime; Error Prone 2.50.0 `error_prone_core-2.50.0-with-dependencies.jar` from Maven Central (sha256 `8ec037a6d57c0d880ed78c6a67445e5018a17a89b42cb6847ddef9081c504378`)
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch10/` (`compile/` extracted snippets + `compile-results.json`, `behavior/Batch10Behavior.java`, `ep.mjs`)

## Method

1. Sources: fetched all 13 unique cited URLs — every one returned HTTP 200 — and matched claim-level passages against the live pages:
   - CompletableFuture API (all 13 `async-*` rules): all 16 quoted passages present verbatim, incl. `anyOf` result/exception wording, `orTimeout` TimeoutException, `exceptionally`, `whenComplete`, `minimalCompletionStage` prescription and "cannot be independently completed…", `thenCompose`, join/getNow "throw the CompletionException directly", `thenCombine`, "actions supplied for dependent completions of non-async methods…", get()/get(timeout) ExecutionException "same cause", `handle`, `allOf`, and the commonPool default-executor paragraph.
   - javac man page: "-Xlint Enables all recommended warnings…", "-Werror Terminates compilation when warnings occur.", "-deprecation option is shorthand for -Xlint:deprecation."
   - javadoc man page: "-Xdoclint Enables recommended checks… By default, the -Xdoclint option is enabled."
   - Integer API: "Deprecated, for removal"; "the static factory valueOf(int) is generally a better choice".
   - Google Java Style: §4.7 quote, §4.8.4.2 fall-through rule, §4.8.8 uppercase-L rule.
   - Error Prone pages: DoubleBraceInitialization, ArrayEquals, IntLongMath, StringCaseLocaleUsage, FormatString, ImmutableEnumChecker, OperatorPrecedence, LongLiteralLowerCaseSuffix — page text supports each rule's quotes, and all eight `errorprone:<Check>` ids exist on the official pages.
2. Compile: extracted both snippets from all 25 rules (50 snippets) and compiled each independently with `javac 23.0.2 -Xlint:all -d <scratch>`, no `--enable-preview`: **50/50 compiled**. Warnings observed: `lint-deprecation-clean` Bad `[removal] Integer(int)…`; `lint-fallthrough-comment` Bad and Good both `[fallthrough] possible fall-through into case`.
3. Behavior: a 44-check bounded harness (`Batch10Behavior`) — all PASS. Highlights:
   - `thenApply` maps and nests a stage-returning function; `thenCompose` flattens; `thenCombine` overlaps (306 ms for two 300 ms stages, not 600 ms).
   - `exceptionally`/`handle`/`whenComplete`: recovery, cause visible, result preserved, failure rethrown as `CompletionException(IllegalStateException)`.
   - `orTimeout` completes exceptionally with `TimeoutException` after 107 ms and passes an already-completed stage.
   - `allOf` waits for all (~306 ms) and wraps any failure in `CompletionException`; `anyOf` returns the first result (52 ms vs 600 ms) and wraps failures.
   - `join` throws `CompletionException` directly (unchecked); `get` throws `ExecutionException` with the same cause and is interruptible (`InterruptedException`).
   - `minimalCompletionStage`: `complete()` and `join()` throw `UnsupportedOperationException`; `toCompletableFuture()` yields an independent copy (JDK `MinimalStage` source confirms).
   - `supplyAsync` without executor ran on `ForkJoinPool.commonPool-worker-1`; with a custom executor ran on its thread; a `thenApply` callback ran on the completing thread; `thenApplyAsync(executor)` pinned to the executor thread.
   - lint runtime: `24 * 60 * 60 * 1000 * 1000 * 1000` = `-1857093632` vs `24L * …` = `86400000000000`; `String.format("%d", String)` throws `IllegalFormatConversionException`; array `.equals` is identity vs `Arrays.equals`; double-brace yields an anonymous subclass; Turkish `"I".toLowerCase(tr)` = `ı` vs `Locale.ROOT` = `i`.
4. Error Prone 2.50.0 (latest, June 2026, run locally with `-XDshould-stop.ifError=FLOW`, `-XepDisableAllChecks` + the cited check at WARN) on each lint Bad/Good pair:
   - OperatorPrecedence, DoubleBraceInitialization, ArrayEquals, StringCaseLocaleUsage, FormatString, LongLiteralLowerCaseSuffix: Bad flagged, Good clean.
   - IntLongMath flags the equivalent non-constant form but skips the rule's constant expression (the checker returns NO_MATCH when `constValue != null`; its own tests cover only non-constant cases) — note below.
   - ImmutableEnumChecker flags the Bad (non-final field) **and the Good** (`'List' is mutable`) — rejection below.
5. Compiler probes: javac `-Xlint:fallthrough` warns on any live fall-through and has no comment-based suppression (JDK 23 `Flow.java`); the comment requirement is the Google-style review convention (rule is `enforce: review`). this-escape: the strict-build Bad never warns — `ThisEscapeAnalyzer` analyzes only public, externally extendable classes with public/protected constructors (confirmed in JDK 23 `src.zip` and current master); a public variant warns under `-Xlint:all` and fails under `-Werror` (rejection below). doclint: Bad produces `error: @param name not found`, Good has no doclint error.
6. Structural: frontmatter/ids/prefixes/enforce-tool consistency, `baseline: latest`, keywords 2–8, summaries ≤30 words without hedging, exactly one Bad/Good Java fence each, ≤16-line snippets, no TODO/elisions/version numbers/preview mentions; all `related` ids and See Also links resolve; INDEX lists all 25 (index lines are short titles, matching the pack convention). No duplicates or near-duplicates within the pack (title+summary similarity below threshold; no cross-batch overlap found).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-async-all-of | verified | allOf quotes incl. "CompletionException holding this exception as its cause"; harness: waits for all (~306 ms), wraps failure |
| java-async-any-of | verified | anyOf quotes; harness: first completion wins (52 ms vs 600 ms), failure wrapped |
| java-async-completion-exception | verified | join/get quote; harness: join → CompletionException directly, get → ExecutionException with same cause |
| java-async-exceptionally | verified | exceptionally quote; harness: recovery, original cause visible, result composable |
| java-async-explicit-executor | verified | commonPool quote; harness: default commonPool worker vs custom executor thread; `newVirtualThreadPerTaskExecutor` is stable API |
| java-async-handle | verified | handle quote; harness: success, failure, and cause all mapped in one function |
| java-async-join-vs-get | verified | join/getNow quote; harness: unchecked CompletionException vs checked ExecutionException, get interruptible |
| java-async-minimal-stage | verified | minimalCompletionStage quotes; harness: complete/join throw UOE, `toCompletableFuture()` copy independent |
| java-async-or-timeout | verified | orTimeout quote; harness: TimeoutException at 107 ms, completed stage passes through |
| java-async-then-combine | verified | thenCombine quote; harness: 306 ms overlap vs 600 ms serial |
| java-async-then-compose | verified | thenCompose quote; harness: thenApply nests, thenCompose flattens |
| java-async-thread-identity | verified | "may be performed by the thread that completes…" quote; harness: callback ran on completing thread; thenApplyAsync pins |
| java-async-when-complete | verified | whenComplete quote; harness: value preserved, failure seen and rethrown |
| java-lint-array-equals | verified | EP page; EP flags Bad, Good clean; runtime identity vs Arrays.equals |
| java-lint-deprecation-clean | verified | javac/Integer quotes; Bad emits `[removal]` (default and with `-deprecation`), Good clean |
| java-lint-doclint | verified | javadoc man quote; Bad doclint error `@param name not found`, Good no doclint error |
| java-lint-double-brace | verified | EP page; EP flags Bad, Good clean |
| java-lint-fallthrough-comment | verified | Google §4.8.4.2 text; Bad lacks marker, Good has `// fall through`. Note: javac warns on both (no comment suppression in javac) |
| java-lint-format-string | verified | EP page; EP flags Bad, Good clean; runtime IllegalFormatConversionException |
| java-lint-immutable-enum | **rejected** | Good still fails its own cited check: EP 2.50 `[ImmutableEnumChecker] 'Suit' has field 'colors' of type 'java.util.List<java.lang.String>', 'List' is mutable`; the page prescribes ImmutableList/ImmutableSet over List/Set |
| java-lint-int-long-math | verified | EP page quotes; overflow verified (`-1857093632` vs `86400000000000`); EP flags the non-constant form; constant example skipped by the checker's `constValue` guard (note) |
| java-lint-long-suffix | verified | EP page + Google §4.8.8; EP flags Bad, Good clean |
| java-lint-operator-precedence | verified | EP page + Google §4.7; EP flags Bad, Good clean |
| java-lint-strict-build | **rejected** | Bad produces no diagnostic under its own recommended flags: javac 23 `-Xlint:all` silent and `-Werror` passes; this-escape requires a public externally extendable class with public/protected constructor (`ThisEscapeAnalyzer`); a public variant warns |
| java-lint-string-case-locale | verified | EP page; EP flags Bad, Good clean; Turkish dotless-ı vs Locale.ROOT verified at runtime |

## Counts

- **verified: 23/25, rejected: 2**
- Compile: 50/50 snippets (javac 23.0.2, no preview). Behavior harness: 44/44 checks pass. Error Prone probes: 6/8 checks cleanly separate Bad/Good; ImmutableEnumChecker fails the Good (reject); IntLongMath skips the constant Bad (note).
- Duplicates: none. Structural checks all pass.

## Blockers and follow-ups

- `java-lint-immutable-enum` (draft): the Good field type `List<String>` is rejected by the cited `errorprone:ImmutableEnumChecker`; use a type the checker recognizes (e.g. Guava `ImmutableList`, or an `@Immutable`-annotated wrapper) or change `enforce: tool` to `review` and reword. Everything else passes.
- `java-lint-strict-build` (draft): make the Bad snippet actually trigger the cited warning — declare `public class Base` with a `public Base()` (this-escape analyzes only public, externally extendable classes with public/protected constructors); then `-Xlint:all` warns and `-Werror` fails, while the private-init Good stays clean.
- Notes (no action required): `java-lint-int-long-math` — EP 2.50's `constValue` guard skips constant-folded expressions, so the documented example is not flagged by the tool while the equivalent non-constant form is; the overflow claim itself is verified. `java-lint-fallthrough-comment` — javac's `-Xlint:fallthrough` warns on the Good too (javac has no comment-based suppression; the comment requirement is the Google-style review convention). `java-async-when-complete` — the Good callback receives `error` but only logs `value`; acceptable minimal example. `java-lint-format-string` — no See Also section; no related java rule exists.
- The 23 verified files were flipped `draft` → `verified`; the two rejected files remain `draft`; no other content was touched. INDEX `verified` count left to the orchestrator (this batch adds 23).

## Addendum (2026-10-05) — rejected rules fixed and re-verified

- `java-lint-immutable-enum`: Good now declares `private final String color = "red";`. Error Prone 2.50.0 re-run (`-XepDisableAllChecks -Xep:ImmutableEnumChecker:WARN`): Bad flagged (`[ImmutableEnumChecker] 'Suit' has non-final field 'colors'`), Good produces no diagnostics; both snippets compile with `javac 23.0.2 -Xlint:all`. Flipped to `verified`.
- `java-lint-strict-build`: Bad now declares `public class Base` with `public Base()` and `public void init()`. Re-probe with javac 23.0.2 (fresh extraction, file named `Base.java` per the public type): Bad emits `[this-escape] possible 'this' escape before subclass is fully initialized` under both `-Xlint:this-escape` and `-Xlint:all`, and fails under `-Xlint:all -Werror`; the Good (private `init`) is silent under `-Xlint:all` and passes `-Werror`. Flipped to `verified`.
- Final counts for this batch: **verified 25/25, rejected 0**.
