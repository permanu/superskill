# Java Batch 2 (`type` + `conc`) — Adversarial Verification Report

- Date: 2026-10-04
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/type-*.md` (14) and `conc-*.md` (16) — 30 rules
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew arm64); `javac -Xlint:all`; JDK 23 runtime
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-java/` (`source_scan2.json`, `compile2-out/`, `behavior2/`)

## Method

1. Fetched all 13 unique cited URLs (HTTP 200) and matched claim-level passages: JEP 394/395/409/440/441/444, JEP 491 (for the author's note), Enum API, Value-based Classes, `java.util.concurrent` package summary, `java.util.concurrent.atomic` package summary, Thread API, ThreadLocal API.
2. Extracted both snippets from all 30 rules and compiled each independently with javac 23.0.2 without `--enable-preview`: **60/60 compiled** (one Good declares a public type and compiles under the validator-documented rule "file named after the public type").
3. Ran 24 self-checking runtime harnesses (bounded, offline, localhost-only) plus one negative compile probe. Highlights: stale read reproduced on the non-volatile flag; 208,974 lost plain increments vs exact AtomicLong; 609,255 lost unlocked deposits; 50k one-task virtual threads in 222ms; blocking unmount with `jdk.virtualThreadScheduler.parallelism=1` (1000 x 100ms sleeps in 156ms); `Thread.stop()` throws `UnsupportedOperationException`; daemon JVM exit vs non-daemon hang; adding a permitted subtype breaks the exhaustive switch at compile time.
4. Scripted structural checks: section order, one Java fence per Bad/Good, ≤25-line snippets, summary ≤30 words, no forbidden tokens/hedges/elisions, `related` ids resolve, See Also links resolve, INDEX lists exactly the 30 files. Pairwise title+summary similarity max 0.47 → no duplicates.
5. Preview audit: no preview syntax (all compiles are non-preview), no rule body mentions preview APIs; all cited JEPs are Closed/Delivered stable features (394/395/409/440/441/444).
6. JEP 491 note assessment: JEP 491 "Synchronize Virtual Threads without Pinning" is Closed/Delivered, Release 24 — virtual threads blocking in `synchronized` release their carrier on the current baseline. Omitting the old "avoid `synchronized` on virtual threads" pinning advice is correct for `baseline: latest`; no rule depends on pinning behavior.
7. Tool ids: no batch-2 rule uses `enforce: tool` (all 30 are `enforce: review`), so there are no tool ids to resolve; no Error Prone citation appears in this batch.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-type-pattern-instanceof | verified | JEP 394 "tedious", "obfuscates the more significant logic", "opportunities for errors to creep"; compile OK; PatternInstanceofTest PASS |
| java-type-record-data-carrier | verified | JEP 395 "low-value, repetitive, error-prone code"; compile OK |
| java-type-record-validate | verified | JEP 395 compact-canonical-constructor and normalization examples; compile OK; RecordValidationTest: `new Range(5,3)` rejected |
| java-type-record-accessor-invariants | verified | JEP 395 copy invariant ("r1.equals(r2) will evaluate to true") + "bad style" example; compile OK; harness shows accessor clamp breaks `equals` copy invariant |
| java-type-local-record | verified | JEP 395 local-record quotes; compile OK; LocalRecordTest PASS |
| java-type-record-pattern | verified | JEP 440 "solely to invoke the accessor methods", "lifts the declaration of local variables"; compile OK; flat + nested pattern harness PASS |
| java-type-sealed-closed-kinds | verified | JEP 409 "fixed set of kinds of values", "defend against unknown subclasses"; compile OK |
| java-type-sealed-public-alternatives | verified | JEP 409 "useless when the goal is modeling alternatives", "cannot access the key abstraction", "brittle tricks"; compile OK (as `Notification.java`, per validator naming) |
| java-type-enum-fixed-instances | verified | JEP 409 "fixed number of instances" vs "fixed set of kinds of values"; compile OK |
| java-type-enum-no-ordinal | verified | Enum API exact quote "Most programmers will have no use for this method…EnumSet and EnumMap"; compile OK; EnumTest name/ordinal/valueOf |
| java-type-exhaustive-switch | verified | JEP 441 match-all quote; compile OK; ExhaustiveSwitchTest PASS; negative compile adding `Pending`: "the switch expression does not cover all possible input values" |
| java-type-switch-null | verified | JEP 441 "will match a null value" / "will throw NullPointerException"; compile OK; harness: `case null` matches, no-label switch NPEs |
| java-type-switch-guard | verified | JEP 441 guard quotes ("does not scale beyond a single condition", "complexity of the test appears on the left"); compile OK; SwitchGuardTest PASS |
| java-type-value-based-identity | verified | ValueBased exact identity/synchronization quote + "synchronization may fail"; compile OK; harness `==` false / `equals` true for LocalDate, Optional, Integer. Note: page names Integer/LocalDate; Optional confirmed value-based by its own API doc |
| java-conc-concurrent-collections | verified | juc "ConcurrentHashMap is normally preferable…", "not governed by a single exclusion lock"; compile OK; 8-thread harness: size and compute() exact at 80k |
| java-conc-blocking-queue | verified | juc "Five implementations…", "producer-consumer, messaging, parallel tasking"; compile OK; blocking handoff harness PASS. Minor: Why generalizes that hand-written queues "get the loop… wrong" while the Bad snippet's wait/notify loop is itself correct; the decision still stands |
| java-conc-latch-not-poll | verified | juc "very simple yet very common utility for blocking…" + synchronizer happens-before; compile OK; LatchTest: blocks before countDown, returns after |
| java-conc-publish-before-start | verified | juc "A call to start on a thread happens-before any action in the started thread"; compile OK; pre-start publication observed; post-start race noted as non-deterministic |
| java-conc-daemon-background-threads | verified | Thread API "shutdown sequence begins when all started non-daemon threads have terminated" + "Virtual threads are daemon threads"; compile OK; daemon JVM exits in <1s, non-daemon killed at 3s (exit 124) |
| java-conc-atomic-counters | verified | atomic package "small toolkit… lock-free thread-safe programming on single variables" + Sequencer/getAndIncrement; compile OK; AtomicLong exact 1,600,000 vs plain lost 208,974 |
| java-conc-lock-consistency | verified | juc monitor quote (exact, including "method entry"); compile OK; synchronized exact vs unlocked lost 609,255 |
| java-conc-volatile-visibility | verified | juc "write to a volatile field happens-before every subsequent read"; compile OK; plain-field polling loop failed to terminate (stale read reproduced), volatile loop terminated |
| java-conc-no-thread-stop | verified | Thread.stop javadoc "stop a victim thread by causing…ThreadDeath"; JEP 444 stop/suspend/resume throw UOE; compile OK (Bad warns `[removal]`); harness: stop() throws UOE, interrupt() works |
| java-conc-executor-close | verified | JEP 444 "executor.close() is called implicitly, and waits"; compile OK; close() waited 349ms, executor shut down |
| java-conc-vt-not-pooled | verified | JEP 444 "cheap and plentiful… should never be pooled"; compile OK; 50k virtual threads in 222ms, daemon=true |
| java-conc-vt-limit-semaphore | verified | JEP 444 "do not be tempted to pool virtual threads… use… semaphores"; compile OK; max concurrency observed = 2 with 10 tasks |
| java-conc-vt-no-threadlocal-cache | verified | JEP 444 "very numerous… careful consideration", "do not use thread locals to pool costly resources"; ThreadLocal "as long as the thread is alive"; compile OK; distinct from threadlocal-cleanup (mutually cross-linked) |
| java-conc-threadlocal-cleanup | verified | ThreadLocal "implicit reference… as long as the thread is alive"; compile OK; pooled thread leaks without remove(), reads null after remove() |
| java-conc-vt-blocking-style | verified | JEP 444 async-style quotes ("asynchronous programming style", "forsake… loops and try/catch", "stack traces provide no usable context"); compile OK; unmount harness: 1000 blocking tasks in 156ms at carrier parallelism=1 |
| java-conc-vt-not-cpu-bound | verified | Thread API "not intended for long running CPU intensive operations"; JEP 444 "not faster threads"; compile OK. Run skipped: no falsifiable runtime claim beyond documented scheduler guidance |

## Counts

- **verified: 30/30, rejected: 0**
- Compile: 60/60 snippets (javac 23.0.2, non-preview). Behavior: 24/24 harnesses pass + 1/1 negative compile probe.
- Duplicates: none (max similarity 0.47). Adjacency `conc-vt-no-threadlocal-cache` vs `conc-threadlocal-cleanup` assessed as distinct decisions (don't cache per-thread resources when threads aren't reused vs deterministic cleanup when ThreadLocal is used), each linking to the other — not merge candidates.
- Formatting/sections/links/INDEX coverage: all pass. Prose `...` in two Why sections is quote elision (repo practice; validator only flags code-fence elisions).

## Blockers and follow-ups

- No blockers. All 30 rule files were flipped `draft` → `verified`; no other content was touched.
- `catalog/rules/java/INDEX.md` still says `Rules: 46 (verified: 16)` and `categories.md` shows type/conc as authored-only; index/status counts are outside the verifier's ownership and are left to the orchestrator (expected after this report: 46 verified).
- Minor observations, not grounds for rejection: `type-sealed-public-alternatives` Good is a public type (validated under the harness's "file named after the public type" rule); `type-value-based-identity`'s Optional example is confirmed by the Optional API doc rather than the ValueBased page; `conc-blocking-queue`'s Why generalization overstates that hand-written wait/notify queues get the protocol wrong.
