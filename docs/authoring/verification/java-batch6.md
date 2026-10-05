# Java Batch 6 (`mem` + `doc`) — Adversarial Verification Report

- Date: 2026-10-05
- Verifier: independent adversarial verifier (fresh context, did not author the rules)
- Scope: `catalog/rules/java/mem-*.md` (12) and `doc-*.md` (12) — 24 rules, all entered as `status: draft`
- Toolchain: javac 23.0.2 (OpenJDK 23.0.2, Homebrew arm64), `javadoc 23.0.2`; deterministic validator `node dist/rules/cli.js validate --lang java --json`
- Scratch artifacts: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/jbatch6/` (`sources/` fetched pages + stripped text, `src/` extracted snippets, `behav/` drivers, `doc/` javadoc runs, `validator*.json`)

## Method

1. Sources: fetched all 11 distinct cited URLs with `curl` (all HTTP 200) and matched every quoted passage in the Why sections against the saved pages, case-insensitively after tag stripping: java.lang.ref package summary, WeakHashMap, Reference, ClassValue, LinkedHashMap, Cleaner, Runtime, Arena, SoftReference (all Java 23 API docs), Google Java Style Guide, Javadoc Documentation Comment Specification (Java 26).
2. Compile: extracted both fenced snippets from all 24 rules (48 snippets) and compiled each independently with `javac 23.0.2 -Xlint:all -d <scratch>`: **48/48 exit 0**. The only diagnostic is the intentional `[dangling-doc-comments]` warning on `doc-comment-placement` Bad (it demonstrates the anti-pattern). `doc-package-info` Good was compiled as `com/example/config/package-info.java`; the two public-class snippets were compiled as `RetryPolicy.java`/`Config.java`.
3. Behavior: 11 offline drivers with timeouts for every `mem` decision (weak eviction, value→key cycles, explicit/backstop cleaning, capturing vs static-carrier actions, confined/shared arenas, ClassValue compute/remove, LRU bound, refersTo, reference-queue enqueueing, System.gc under `-XX:+DisableExplicitGC`, soft-ref clearing under `-Xmx64m`). For `doc` rules, ran `javadoc -Xdoclint:all -package` on every Bad/Good snippet and inspected the generated HTML.
4. Idiom/structure/links: section order, exactly one `java` fence per Bad/Good, one `## See Also` each, summaries ≤ 30 words, snippets ≤ 25 lines, no TODO/elision/unicode-ellipsis, no hedging in summaries, every `related` ID and See Also link resolves, no `enforce: tool` claims, no preview features (FFM compiled as final JDK 23 API).
5. Validator: `validate --lang java --json` reports zero errors and zero warnings for the batch except one harness gap (below).

## Source findings

All quoted claims are verbatim or faithful paraphrases of the cited pages. Representative confirmations:

- ref package summary: "implementing canonicalizing mappings that do not prevent their keys (or values) from being reclaimed"; "if a registered reference becomes unreachable itself, then it will never be enqueued"; "It is the responsibility of the program to ensure that reference objects remain reachable…".
- WeakHashMap: "will automatically be removed when its key is no longer in ordinary use"; "The value objects in a WeakHashMap are held by ordinary strong references"; values must not "strongly refer to their own keys…".
- Reference: API note on `get()` — "This method returns a strong reference to the referent. This may cause the garbage collector to treat it as strongly reachable until some later collection cycle"; "use ref.refersTo(obj) rather than ref.get() == obj".
- ClassValue: "lazily associate a computed value with (potentially) every type"; "The actual installation of the value on the class is performed atomically"; "one is chosen, and returned to all the racing threads".
- LinkedHashMap: access order is "the order in which its entries were last accessed"; "This kind of map is well-suited to building LRU caches"; `removeEldestEntry` is "invoked by put and putAll after inserting a new entry".
- Cleaner: "The most efficient use is to explicitly invoke the clean method when the object is closed or no longer needed"; "at most once when the object has become phantom reachable unless it has already been explicitly cleaned"; "the cleaning action must not refer to the object being registered"; a lambda "all too easily will capture the object reference…".
- Runtime: `gc` "suggests that the Java Virtual Machine expend effort toward recycling unused objects"; no guarantee of any particular reclamation; "performs this recycling process automatically as needed, in a separate thread, even if the gc method is not invoked explicitly".
- Arena: "controls the lifecycle of native memory segments…"; confined segments "can only be accessed (and closed) by the thread that created the arena" and cross-thread close "will fail with a WrongThreadException"; shared arenas "have no owner thread"; global-arena memory "never deallocated"; close releases "any off-heap region of memory backing the segments obtained from this arena".
- SoftReference: "cleared at the discretion of the garbage collector in response to memory demand"; all soft references are cleared before `OutOfMemoryError`; no constraints on clearing time/order.
- Google style 7.3/7.3.2/7.2/7.1.3 and Javadoc spec (inheritance by omission, package-info, method tag list, inline `{@return}` since JDK 16, placement before annotations, `{@snippet}` inline/external + inline `*/`/balanced-brace limits, `{@code}` code font, `{@link}` visible-label link, `@exception` equivalent to `@throws`): all quoted wording confirmed verbatim.

## Compile results

`javac 23.0.2 -Xlint:all`: **48/48 snippets exit 0**.

- `doc-comment-placement` Bad: `warning: [dangling-doc-comments] documentation comment is not attached to any declaration` — expected, and the strongest tool-level evidence for the rule.
- All other 47 snippets: zero diagnostics.

## Behavior evidence

- `mem-weak-cache`: WeakHashMap entry evicted after the key is dropped; HashMap retains the same key. Weak eviction converged in every run.
- `mem-weakmap-value-keys`: value holding its own key → entry retained forever (cycle reproduced); value without a back-reference → entry evicted.
- `mem-cleaner-explicit-clean`: explicit `clean()` runs the action once, second call is a no-op, GC backstop runs it once after drop (`runs` 1 → 1 → 2).
- `mem-cleaner-no-capture`: capturing lambda action never ran after repeated `System.gc()` (runs = 0); static-carrier record action ran (runs = 1).
- `mem-arena-confined`: confined segment access from a non-owner thread → `WrongThreadException: Attempted access outside owning thread`; shared segment access from another thread → OK; confined close from another thread → `WrongThreadException`.
- `mem-classvalue`: first `get` computes once; 8 concurrent `get`s all return the same value with no recompute; `remove` + `get` recomputes.
- `mem-lru-bound`: with max 3, access-touch of `a` then `put(d)` evicts `b` → keys `[c, a, d]`.
- `mem-refers-to`: `refersTo(o)` true, `refersTo(other)` false; after collection `get() == null` and `refersTo(null)` true.
- `mem-reference-reachable`: reference object not retained → never enqueued (poll null after 30 GC cycles); retained reference → enqueued.
- `mem-arena-offheap`: segment use after arena close → `IllegalStateException`; global-arena segment still accessible after `System.gc()`; `allocateFrom` byte size 3.
- `mem-system-gc`: normal run clears a weakly-held object right after `System.gc()`; under `-XX:+DisableExplicitGC` the call is a no-op (still uncleared after 30 explicit calls) — the hint behavior reproduced.
- `mem-softref-cache`: with `-Xmx64m`, the 8 MiB soft referent is cleared before OOME in 2/2 runs; the recompute-on-null pattern yields a fresh value.

## Javadoc evidence (doc rules)

- `doc-public-coverage`: Bad → `no comment` warnings for class and method; Good → none (remaining `no @return` is `doc-return`'s concern).
- `doc-return`: Bad → `no @return`; Good → none; generated page shows the "Returns the length of the text" section produced by inline `{@return}`.
- `doc-param`: Bad → `no @param for text`, `no @param for width`; Good → none.
- `doc-throws`: Bad → `no @throws for java.io.IOException`; Good → none.
- `doc-comment-placement`: Bad page contains no method description (comment is dangling); Good page contains "Returns the service name." twice.
- `doc-link`: Good method description renders `<div class="block">Returns a <a href="Result.html"><code>Result</code></a> for…`; Bad renders plain text. A deliberately broken `{@link NoSuchType}` makes javadoc fail with `error: reference not found`, confirming the validation claim.
- `doc-snippet`: Good renders `class="snippet-container"`/`class="snippet"` markup; Bad renders a plain `<pre>`; both include the code.
- `doc-code`: both render `<`; Good wraps it in `<code>`, Bad leaves a bare entity.
- `doc-package-info`: package with `package-info.java` → package-summary contains the description; same package without it → no description.
- `doc-override-omit`, `doc-summary-fragment`, `doc-tags-order`: style decisions; javadoc does not enforce them (no missing-comment warning for the override, no order warning), and the Google style wording is verified verbatim. Not tool-enforced, which matches `enforce: review`.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| java-mem-weak-cache | verified | ref-package + WeakHashMap quotes exact; eviction reproduced, strong map retains |
| java-mem-weakmap-value-keys | verified | WeakHashMap value quote exact; cycle retained vs no-back-ref evicted |
| java-mem-softref-cache | verified | SoftReference quotes exact; cleared under `-Xmx64m` 2/2; recompute pattern works |
| java-mem-classvalue | verified | ClassValue quotes exact; compute-once, 8-thread agreement, remove recomputes |
| java-mem-lru-bound | verified | LinkedHashMap quotes exact; LRU order `[c, a, d]`, `b` evicted |
| java-mem-system-gc | verified | Runtime.gc quotes exact; no-op under `-XX:+DisableExplicitGC` |
| java-mem-cleaner-explicit-clean | verified | Cleaner quotes exact; explicit once, second no-op, GC backstop runs |
| java-mem-cleaner-no-capture | verified | Cleaner capture quotes exact; capturing action never ran, carrier action ran |
| java-mem-reference-reachable | verified | ref-package quotes exact; dangling ref never enqueued, retained ref enqueued |
| java-mem-refers-to | verified | Reference API note exact; refersTo true/false/null semantics confirmed |
| java-mem-arena-confined | verified | Arena quotes exact; `WrongThreadException` on confined cross-thread access/close, shared OK |
| java-mem-arena-offheap | verified | Arena quotes exact; use-after-close throws, global never freed |
| java-doc-public-coverage | verified | Google 7.3 quote exact; Bad `no comment` warnings disappear in Good |
| java-doc-override-omit | verified | Google 7.3.2 + spec inheritance-by-omission quotes exact; override needs no comment |
| java-doc-package-info | verified | spec package-info quote exact; description appears only with package-info.java (see harness note) |
| java-doc-param | verified | spec method tag list exact; Bad missing-@param warnings, Good clean |
| java-doc-return | verified | spec @return/inline-JDK-16 quotes exact; Bad `no @return`, Good renders Returns section |
| java-doc-throws | verified | spec throws + @exception-equivalence quotes exact; Bad `no @throws`, Good clean |
| java-doc-tags-order | verified | Google 7.1.3 order/empty-description quote exact; style-only, no tool enforcement claimed |
| java-doc-comment-placement | verified | spec placement quotes exact; javac dangling-doc warning + generated HTML confirm |
| java-doc-snippet | verified | spec snippet quotes exact incl. inline `*/`/brace limits; snippet markup rendered |
| java-doc-code | verified | spec {@code} quote exact; `<` renders in code font vs bare entity |
| java-doc-summary-fragment | verified | Google 7.2 quote exact; style-only, no tool enforcement claimed |
| java-doc-link | verified | spec {@link} quote exact; real link in description; broken link → javadoc error |

## Counts

- **verified: 24/24, rejected: 0**
- Status flips applied: all 24 `mem-*`/`doc-*` files changed `draft` → `verified`; no other edits made.

## Notes (non-blocking)

- **Harness gap for `java-doc-package-info`**: the deterministic validator reports `compile-failed` for its Good snippet because `src/rules/harness/java.ts` wraps non-type snippets in a class or `main`, and a `package` declaration is illegal there. The snippet is valid Java and compiles cleanly as `com/example/config/package-info.java` with `javac 23 -Xlint:all`; the Go harness already has the analogous branch for unit-level `package main` snippets. Recommended fix (outside this verifier's ownership): if a Java snippet contains a `package` declaration and no type declaration, write it as `package-info.java` and compile that. No rule content change needed.
- `doc-comment-placement` Bad intentionally produces `[dangling-doc-comments]` under `-Xlint:all`; it compiles, and the warning is the evidence the rule is about.
