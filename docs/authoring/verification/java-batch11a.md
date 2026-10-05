# Java Batch 11a (`pat` + `type` + `api` + `conc` + `ann` + `const` + `test`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/` — `pat-*` (4), `type-*` batch files (4: sealed-permits-inferred, sealed-non-sealed, record-accessor-override, enum-abstract-method), `api-*` (2: copy-input-collections, static-factory), `conc-*` (4: vt-pinning, bounded-queue, timed-poll, lock-finally), `ann-*` (5), `const-*` (4), `test-*` (3: assumptions, per-class-lifecycle, display-name) — 26 rules
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew), `--release 23`, `-Xlint:all`, no `--enable-preview`; JUnit 6.1.3 (`junit-platform-console-standalone-6.1.3.jar` sha256 `e62b96ac475dbcde8599ea905d088f65d90778f86e259b856a49fa5c4ea256ec`, `junit-jupiter-api-6.1.3.jar` sha256 `555d6cf20fa1710884dd01b86cc5785397ba73e21ada2d4b784f5f1a14dcafc4`) from Maven Central
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/java-batch11a/` (`src/` 52 extracted snippets, `compile-results.txt`, `behavior/` 50-case harness + `behavior-results.json`, `manifest.json`, `extract.py`, `structural.py`, `dups.py`)

## Method

1. Sources: fetched all 23 unique cited URLs — every one returned HTTP 200 — and matched claim-level passages against the live pages (HTML tags/entities normalized; the few raw misses were inline-`<code>` spacing artifacts, confirmed by surrounding windows):
   - JEP 394 (flow scoping + definite-assignment wording), JEP 395 (@Override extended to record accessors), JEP 409 ("inferred to have three permitted subclasses"; non-sealed re-opens a branch), JEP 440 (nested record patterns; raw-type inference), JEP 441 ("allowing patterns to appear in case labels"; "cover all possible input values"), JEP 444 (pinning wording and `BlockingQueue.take()` carrier blocking) — all quotes verbatim.
   - Oracle APIs: Collection (two standard constructors, copy semantics), Integer (valueOf caching preference; value-based synchronization warning), ArrayBlockingQueue ("bounded buffer", capacity fixed, put blocks), BlockingQueue (non-empty wait; `poll(timeout, unit)`), ReentrantLock ("immediately follow a call to lock with a try block … unlock as the first statement in the finally block"), Class (getMethod vs getDeclaredMethod), Inherited, InvocationTargetException, Retention (default CLASS), RetentionPolicy (SOURCE/RUNTIME) — all passages present.
   - Google Java Style §5.2.4 ("deeply immutable … no detectable side effects"; "merely intending to never mutate the object is not enough"), Java Tutorials Enum Types ("any time you need to represent a fixed set of constants"), Error Prone ImmutableEnumChecker ("TIP: Instead of creating an enum with functional interface fields … declare abstract methods that are overridden by each constant"), BigDecimal (ZERO/ONE/TWO/TEN scale-0 fields), JUnit 6.1.3 Assumptions / Test Instance Lifecycle / Display Names — all passages present.
   - One cited-source gap found: `java-const-bigdecimal-constants` (see rejection).
2. Compile: extracted both snippets from all 26 rules (52 snippets) and compiled each independently with `javac 23.0.2 --release 23 -Xlint:all -d <scratch>` (JUnit snippets against the 6.1.3 jars), no preview: **52/52 compiled**. Warnings: only `java-const-value-based-no-sync` Bad emits `[synchronization] attempt to synchronize on an instance of a value-based class` (supports the rule; `enforce: review` is unchanged). All other 51 snippets warning-free.
3. Behavior: a 50-case bounded harness (30 s timeouts) — **50/50 PASS**, including:
   - Patterns: negated-guard flow scope (`a=hi;b=other`); nested deconstruction (`a=3;b=0`); raw-type inference (`first(new MyPair<>("a",1))="a"`); switch expression/statement equivalence (`c=12.5664;q=9.0;u=0.0`, locale-normalized).
   - Sealed: inferred permits visible via `getPermittedSubclasses()=[Circle, Square]`; non-sealed allows external `Extra extends Rectangle` (`isSealed=false;final=false;extra=true`) while Bad+Extra fails `error: cannot inherit from final Rectangle`; a permitted subclass with no modifier fails `error: sealed, non-sealed or final modifiers expected`.
   - Records/enums: accessor override works (`x=5`); renaming the component silently compiles without `@Override` but fails with it (`error: method does not override or implement a method from a supertype`); functional-field vs abstract-method enums behave identically (`a=true;b=false;c=true;d=false`).
   - API/concurrency: input-copy Bad aliases (stored=2 after caller mutation) vs Good snapshot (stored=1); static factory private ctor (`size=2;privateCtor=true`); virtual-thread pinning on JDK 23 with `jdk.virtualThreadScheduler.parallelism=1` — Bad pin trace `reason:MONITOR … Consumer.take(Snippet.java:8) <== monitors:1` and `startedWhilePinned=false`, Good `startedWhilePinned=true`; bounded queue blocks at capacity (`blocked=true;offer=false`) vs `remainingCapacity=2147483647` unbounded after 10 000 puts; timed poll returns null after ≥150 ms, `take` unobservable before put; lock/finally `v=1;locked=false` plus throwing-body probes (finally releases `lockedAfterThrow=false`; no-finally leaks `lockedAfterThrow=true`).
   - Annotations: private `compute` → Bad `NoSuchMethodException` vs Good `compute`; @Inherited child lookup false/true; wrapper `getMessage()=null;cause=null` vs `cause=IllegalArgumentException: boom`; default retention invisible (`audited=false`) vs RUNTIME visible; SOURCE discarded (`generated=false`).
   - Constants: mutable static set accepts add vs `Set.of()` throws `UnsupportedOperationException`; `Flag` rejects an int (`error: incompatible types: int cannot be converted to Flag`); `Integer.valueOf(5)` shared vs 1000 distinct, same monitor.
   - JUnit: `assumeTrue(false)` → `org.opentest4j.TestAbortedException`, launcher reports `1 tests aborted` (ENV unset) / `1 tests successful` (ENV=CI); PER_CLASS `1 tests successful`, non-static `@BeforeAll` without PER_CLASS → `must be static unless … @TestInstance(Lifecycle.PER_CLASS)`, two tests share one instance (`instances=1;seen=1`); display name appears in the launcher report (`invoice totals include tax ✔`).
4. Structural: frontmatter/ids/prefixes/severity/enforce, `baseline: latest`, summaries ≤30 words without hedging, exactly one Bad/Good Java fence each (all ≤23 lines), section order, no TODO/elisions/version numbers/preview mentions, keywords 2–8, every `related` id and See Also link resolves, all 26 present in INDEX.md — no problems.
5. Duplicates: token-similarity scan of titles+summaries against all 274 Java rules; max Jaccard 0.278 (`const-static-final-immutable` vs `lint-immutable-enum`, which governs enum instance fields, not constant definition). Manual review of every nearest neighbor (pattern rules, sealed rules, record-accessor rules, api exposure/factory, blocking-queue/timed-poll/lock rules, retention rules, value-based identity, enum-fixed-instances, test rules) confirmed distinct decisions. No duplicates or near-duplicates.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-pat-flow-scope | verified | JEP 394 quotes verbatim; both compile; `describe("  hi ")=hi`, `describe(7)=other` |
| java-pat-nested-deconstruction | verified | JEP 440 quote verbatim; nested `Line(Point(var x,var y),…)` compiles; `startX(Line(Point(3,4),…))=3`, non-match `0` |
| java-pat-record-inference | verified | JEP 440 raw-type inference quote verbatim; `first(new MyPair<>("a",1))="a"` |
| java-pat-switch-expression | verified | JEP 441 goals ("allowing patterns to appear in case labels"; "cover all possible input values"); both variants compile and agree |
| java-type-sealed-permits-inferred | verified | JEP 409 quote verbatim; both compile; `getPermittedSubclasses()=[Circle, Square]`, `isSealed=true` |
| java-type-sealed-non-sealed | verified | JEP 409 quote; external subclass allowed by Good; Bad+subclass `cannot inherit from final`; no-modifier probe `sealed, non-sealed or final modifiers expected` |
| java-type-record-accessor-override | verified | JEP 395 quote verbatim; Good `x=5`; rename probe: Bad silently compiles, Good fails `does not override or implement` |
| java-type-enum-abstract-method | verified | Error Prone tip verbatim; both compile; functional-field and abstract-method enums agree on all four checks |
| java-api-copy-input-collections | verified | Collection javadoc quotes; Bad stored=2 after caller mutation, Good stored=1 |
| java-api-static-factory | verified | Integer javadoc quote; `Names.of("a","b")` works, constructor private |
| java-conc-vt-pinning | verified | JEP 444 quotes verbatim; JDK 23 pin trace `reason:MONITOR … monitors:1` + carrier starvation with Bad, no starvation with Good (see note) |
| java-conc-bounded-queue | verified | ArrayBlockingQueue quotes; capacity 100/99, put blocks at capacity 1 (`offer=false`); unbounded Bad `remainingCapacity=2147483647` after 10 000 puts |
| java-conc-timed-poll | verified | BlockingQueue poll quote; empty poll null after ≥150 ms; item delivered; `take` blocked before put, returned after |
| java-conc-lock-finally | verified | ReentrantLock quote verbatim; `v=1;locked=false`; throwing-body probes: finally releases, no-finally leaks |
| java-ann-getdeclaredmethod | verified | Class javadoc quotes; private method: `getMethod` → NoSuchMethodException, `getDeclaredMethod` → found |
| java-ann-inherited | verified | Inherited javadoc quote; child annotation false without / true with `@Inherited` |
| java-ann-invocation-target | verified | InvocationTargetException quotes; Bad loses cause (`null`), Good preserves `IllegalArgumentException: boom` |
| java-ann-runtime-retention | verified | Retention/RetentionPolicy quotes; default CLASS invisible at runtime, RUNTIME visible |
| java-ann-source-retention | verified | RetentionPolicy quotes; SOURCE discarded (`generated=false`), RUNTIME present |
| java-const-static-final-immutable | verified | Google §5.2.4 quotes; mutable set accepts add, `Set.of()` throws UnsupportedOperationException |
| java-const-bigdecimal-constants | **rejected** | Why false on baseline: `BigDecimal.valueOf(0) == BigDecimal.ZERO` → `true` (also with `-Xint`); javap of `valueOf(long)` returns `ZERO_THROUGH_TEN[val]` for 0–10, so it allocates nothing and scale is already 0. Bad is not bad |
| java-const-enum-instead-of-int | verified | Tutorial quote; enum works; int rejected `incompatible types: int cannot be converted to Flag` |
| java-const-value-based-no-sync | verified | Integer warning quote; `valueOf(5)` shared vs 1000 distinct, same monitor; javac `[synchronization]` flags the Bad |
| java-test-assumptions | verified | JUnit quote; TestAbortedException; launcher `1 tests aborted` vs `1 tests successful` by environment |
| java-test-per-class-lifecycle | verified | JUnit quote; Good passes; non-static `@BeforeAll` without PER_CLASS errors `must be static unless … PER_CLASS`; two tests share one instance |
| java-test-display-name | verified | JUnit quote; launcher report shows `invoice totals include tax ✔` |

## Counts

- **verified: 25/26, rejected: 1**
- Compile: 52/52 snippets (javac 23.0.2, `-Xlint:all`, no preview). Behavior harness: 50/50 checks pass; plus the sealed no-modifier compile probe and the BigDecimal bytecode/identity probe.
- Duplicates: none. Structural checks all pass.

## Blockers and follow-ups

- `java-const-bigdecimal-constants` (draft): reword the Why — `BigDecimal.valueOf(0)` returns the shared `ZERO` (and `valueOf(1)` returns `ONE`) on the current JDK, so "allocates a new object" and "leaves scale choices to the caller" are both false, and the Bad snippet is behaviorally identical to the Good. Either state the rationale as naming/clarity only ("the named constants state the intent; `valueOf` happens to share them today, but the constant is the documented scale-0 value") or change the Bad to a genuinely distinct form. The rule is otherwise structurally sound.

## Notes (non-blocking)

- `java-conc-vt-pinning`: verified against the batch-pinned javac 23.0.2 toolchain, where pinning is real (pin trace captured). Caveat for the pack owner: JEP 491 removes synchronized pinning in newer stable JDKs, so the literal `baseline: latest` rationale is version-sensitive; if the verification toolchain moves past 23, re-check or reword.
- `java-pat-switch-expression`: the Why embeds a mid-sentence quote fragment ("switch statements by requiring that pattern switch statements cover all possible input values"); the source sentence is "Increase the safety of switch statements by requiring that pattern switch statements cover all possible input values." Supported, but the prose reads awkwardly.
- `java-const-value-based-no-sync`: javac already emits `[synchronization]` for the Bad; `enforce: review` is still correct because the rule makes no tool-enforcement claim.
- Behavior harness only: the first switch-expression run compared `12,5664` (host locale) against a dot-decimal expectation; re-run with `Locale.ROOT` passed. No rule content involved.
- The 25 verified files were flipped `draft` → `verified`; `java-const-bigdecimal-constants` remains `draft`; no other content was touched. INDEX `verified` count left to the orchestrator (this batch adds 25).

Addendum (2026-10-05): `java-const-bigdecimal-constants` fixed (Bad now `new BigDecimal(0)`, Why reworded) — both snippets compile with `javac 23.0.2 -Xlint:all`, behavior confirms `new BigDecimal(0) != ZERO` with fresh allocation per call and scale 0 while `ZERO` is shared; flipped to `verified` — final counts: verified 26/26, rejected 0.
