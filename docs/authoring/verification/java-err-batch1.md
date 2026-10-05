# Java `err` Batch 1 — Adversarial Verification Report

- Date: 2026-10-04
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/err-*.md` (16 rules)
- Toolchain: javac 23.0.2 (OpenJDK, Homebrew arm64); `javac -Xlint:all`
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-java/` (`source_scan.json`, `compile-out/`, `behavior/`)

## Method

1. Fetched all 25 unique cited URLs (HTTP 200) and matched claim-specific passages (JLS SE 23, Java SE 23 API docs, OpenJDK JEPs, Oracle tutorials, Google Java Style §6.2, Error Prone docs). All four Error Prone ids cited anywhere in the pack exist: `EmptyCatch`, `Finally`, `FutureReturnValueIgnored`, `InterruptedExceptionSwallowed`.
2. Extracted both snippets from every rule and compiled each independently with javac 23.0.2: **32/32 compiled**.
3. Ran runtime harnesses in the scratch dir for the behavioral claims: suppressed cleanup, try-with-resources close order/suppression, interrupt-status restore, retry loop, JDK HTTP retry default, Future observation, uncaught handler, finally abrupt completion, cause chaining. All passed.
4. Scripted structural checks: section order, exactly one fenced Java block per Bad/Good, ≤25-line snippets, summary ≤30 words, no forbidden tokens/hedges/elisions, `related` ids resolve, See Also links resolve, duplicate scan (max pairwise title+summary similarity 0.45 → no duplicates).
5. Unnamed catch variable `_` corroborated as stable: JEP 456 (Closed/Delivered, Release 22), Google Java Style §6.2 itself uses `catch (NumberFormatException _)`, and javac 23 accepts it without preview.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| java-err-no-empty-catch | verified | GJS §6.2 "very rarely correct… explained in a comment" + its `_` example; Error Prone EmptyCatch 200; javac Bad/Good OK | mirrors the style-guide example |
| java-err-checked-vs-unchecked | verified | Oracle runtime.html "bottom line guideline" recoverability text; JLS 11.2 checked/unchecked classes; javac OK | |
| java-err-retry-idempotent | verified | module-summary `jdk.httpclient.enableAllMethodRetry (default: false)`; live probe: default POST → acceptedRequests=1 + IOException; `-D…=true` → acceptedRequests=2 + 200; RetryLoopTest 3 attempts, write effect applied 3×; javac OK | strongest possible evidence for the default |
| java-err-suppressed-cleanup | verified | Throwable.addSuppressed "multiple sibling exceptions and only one can be propagated"; SuppressedCleanupTest: primary kept, close failure in `getSuppressed()`; Bad replaces primary; javac OK | |
| java-err-no-catch-throwable | verified | Error API "serious problems that a reasonable application should not try to catch"; javac OK | |
| java-err-try-with-resources | verified | tutorial: close "opposite order of their creation" + explicit paragraph "if…br.close()…throws…the FileReader has leaked"; TwrTest reverse order [b,a] and suppressed [close-b, close-a]; javac OK | snippets use one resource; claim confirmed by tutorial + harness |
| java-err-custom-type | verified | creating.html differentiate/vendors checklist; Throwable "freshly created in the context of the exceptional situation"; javac OK | Good triggers benign `[serial]` warning (no serialVersionUID) |
| java-err-wrap-cause | verified | Throwable "would tie the API of the upper layer…"; chained.html; WrapCauseTest cause preserved vs lost; javac OK | |
| java-err-future-observed | verified | Error Prone "ignoring returned Futures suppresses exceptions…"; Future.get → ExecutionException; FutureObservedTest ignored hides / get surfaces cause; javac OK | |
| java-err-finally-normally | verified | JLS 14.20.2 "finally block completes abruptly… try statement completes abruptly for the same reason"; EP Finally (FragileCode); FinallyNormallyTest value and exception both discarded; javac OK | javac itself warns `[finally]` on the Bad snippet |
| java-err-multicatch | verified | catch.html "reduce code duplication… overly broad" + "catch parameter is implicitly final"; javac OK | |
| java-err-vt-uncaught-handler | verified | ThreadGroup default "printed to the standard error stream"; JEP 444 "virtual thread is an instance of java.lang.Thread"; UncaughtHandlerTest custom handler invoked, default path captured on stderr; javac OK | |
| java-err-optional-return | verified | Optional API note "primarily intended for use as a method return type… using null is likely to cause errors"; javac OK | |
| java-err-interrupt-restore | verified | Thread.sleep docs "interrupted status… cleared when this exception is thrown"; EP InterruptedExceptionSwallowed 200; InterruptTest Good keeps `isInterrupted()==true`, Bad clears it; javac OK | |
| java-err-fail-fast-args | verified | runtime.html argument-checking paragraph; javac OK | |
| java-err-catch-specific | verified | advantages.html "specific handlers… very specific exception"; catch.html overly-broad temptation; javac OK | |

## Counts

- **verified: 16/16, rejected: 0**
- Compile: 32/32 snippets (javac 23.0.2). Behavior harnesses: 9/9 pass.
- Duplicates: none (max similarity 0.45); all `related` ids and See Also links resolve; formatting/section/anti-slop checks pass for all 16.

## Blockers and follow-ups

- No blockers. All 16 rule files were flipped `draft` → `verified`; no other content was touched.
- `catalog/rules/java/INDEX.md` still says `Rules: 16 (verified: 0)`; updating the index is outside the verifier's ownership and is left to the orchestrator.
- Minor observations, not grounds for rejection: `err-custom-type` Good emits a `[serial]` warning; `err-try-with-resources` snippets demonstrate the construct with a single resource while the reverse-order/suppression claims are evidenced by the tutorial and the harness.
