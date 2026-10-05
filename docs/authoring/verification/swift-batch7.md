# Verification Report - Swift `async` + `perf` Batch 7

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/swift/async-*.md` (12) and `catalog/rules/swift/perf-*.md` (12); all entered as `status: draft`; **24/24 flipped to `verified`**
- Toolchain: Apple Swift 6.4 (swiftlang-6.4.0.34.1, clang-2100.3.34.1), arm64-apple-macosx26.0; `swiftc -typecheck` (default = Swift 5 language mode) and `swiftc -swift-version 6 -typecheck`; SwiftLint 0.65.1 (Homebrew)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch7` (48 extracted snippets, typecheck logs, 8 runtime harnesses x 2 modes, 24 perf executions, fetched sources, SwiftLint probe outputs)

## Method

1. Fetched all 21 distinct cited URLs (all HTTP 200). TSPL human URLs are JavaScript shells, so the prose was read from the swift-book GitHub sources (`Concurrency.md`, `StringsAndCharacters.md`); SE proposals were read raw from swift-evolution; Apple API pages were read through their `tutorials/data/...json` payloads (the HTML shells do not contain the prose); SwiftLint pages were read from the static HTML and cross-checked against installed SwiftLint 0.65.1.
2. Extracted both fenced snippets from all 24 rules (48 files) and ran `swiftc -typecheck` in default mode and `-swift-version 6`: 48/48 pass in both modes (96/96 exit 0, 0 warnings).
3. Probed the Swift 6 `noasync` availability directly: `Thread.sleep(forTimeInterval:)` and `DispatchSemaphore.wait()` called *directly* from an async function are a warning in default mode ("this is an error in the Swift 6 language mode") and an error under `-swift-version 6`. The two blocking-call Bads route the primitive through a synchronous helper, so they compile in both modes - exactly as their Whys state (see "noasync assessment").
4. Ran 8 bounded runtime harnesses (async overloads, protocol async witnesses, AsyncSequence/AsyncStream/AsyncThrowingStream adapters, stream termination, structured vs unstructured tasks, task-handle cancellation, `Task.sleep`, continuation wrapper) in both language modes: 16/16 compile and exit 0. Compiled and executed all 12 `perf` Bad/Good pairs with `-O` and compared behavior; ran an explicit dictionary-equality harness for `reduce(into:)`.
5. Ran SwiftLint `--only-rule` probes on the Bad/Good snippets for every rule carrying a `swiftlint:` tool id (8 rules), plus two supplementary probes for the patterns not exercised by the pairs (`filter { }.isEmpty`, `== []`).
6. Ran the deterministic validator, then a structural audit of the 24: frontmatter, id/path match, section order, one `swift` fence per Bad/Good, summary word counts, snippet line caps, anti-slop tokens, `related` id resolution, `## See Also` link resolution, duplicate/near-duplicate scan.

## Source evidence (claim-specific)

- **SE-0296 (async/await)**: Problem 1 "A sequence of simple asynchronous operations often requires deeply-nested closures"; Problem 2 "Callbacks make error handling difficult and very verbose"; Problem 3 "Conditionally executing an asynchronous function is a huge pain"; Problem 4 "It's quite easy to bail-out of the asynchronous operation early by simply returning without calling the correct completion-handler block"; overload resolution "prefers non-`async` functions within a synchronous context ... prefers `async` functions within an asynchronous context" and the avoided alternative "a scheme such as C#'s pervasive `Async` suffix"; protocol conformance "A protocol requirement can be declared as `async`. Such a requirement can be satisfied by an `async` or synchronous function"; blocking "Asynchronous functions should avoid calling functions that can actually block the thread, especially if they can block it waiting for work that's not guaranteed to be currently running" and "waiting on a condition variable ... goes strongly against recommendation".
- **TSPL Concurrency**: the completion-handler example is followed by "because the code has to be written as a series of completion handlers, you end up writing nested closures"; unstructured concurrency "an *unstructured task* doesn't have a parent task ... you're also completely responsible for their correctness. ... Both of these operations return a task that you can interact with --- for example, to wait for its result or to cancel it."
- **SE-0298 (AsyncSequence)**: "an intuitive, built-in way to write and use functions that return many values over time"; adoption intent "We are hoping for widespread adoption of the protocol in API which would normally have instead used a `Notification`, informational delegate pattern, or multi-callback closure argument"; `for await` iteration and sequence algorithms (`map`/`filter`/`reduce`/...) are specified in the proposal.
- **SE-0304 (Structured concurrency)**: "a function that creates a child task must wait for it to end before returning"; "cancellation naturally propagates through APIs and down to child tasks"; "Child tasks automatically inherit their parent task's priority"; unstructured tasks "lifetime is not bound to the creating task" and "All unstructured tasks are represented by a task handle, which can be used to retrieve the value (or thrown error) produced by the task, cancel the task, or perform queries of the task's status."
- **SE-0314 (AsyncStream)**: continuations adapt single-result callbacks ("These single-use continuations work well for adapting APIs like the `getInt(completion:)` function"); multi-value sources use a stream ("Rather than being adapted to an `async` function, the appropriate solution for these operations is to create an `AsyncSequence`"); `finish(throwing:)` for error-producing sources; "By default, every element yielded to an `AsyncStream`'s continuation is buffered until consumed by iteration"; "If the caller specifies `0`, the stream switches to a dropping behavior, dropping the value if nothing is `await`ing the iterator's `next`"; `bufferingOldest(Int)`/`bufferingNewest(Int)` "keep the specified amount"; "a continuation's `onTermination` handler function is called when iteration ends, when the stream goes out of scope, or when the task containing the stream is canceled. You can safely use the `onTermination` handler to clean up resources"; the proposal's own `QuakeMonitor` example constructs a local monitor inside the stream builder.
- **Apple `Task.sleep(for:tolerance:clock:)`**: "Suspends the current task for the given duration. ... If the task is canceled before the time ends, this function throws. ... This function doesn't block the underlying thread."
- **Apple `Collection.isEmpty`**: "use the property instead of checking that the `count` property is equal to zero. For collections that don't conform to `RandomAccessCollection`, accessing the `count` property iterates through the elements"; "O(1)".
- **Apple `Array.lazy`**: "A sequence containing the same elements as this sequence, but on which some operations, such as `map` and `filter`, are implemented lazily."
- **Apple `Array.reduce(into:_:)`**: "This method is preferred over `reduce(_:_:)` for efficiency when the result is a copy-on-write type, for example an Array or a Dictionary"; the closure receives the accumulator `inout`.
- **Apple `Array.removeFirst(_:)`**: "Removes the specified number of elements from the beginning of the collection. ... Calling this method may invalidate any existing indices ... O(n), where n is the length of the collection."
- **Apple `Set`**: "You use a set instead of an array when you need to test efficiently for membership and you aren't concerned with the order of the elements."
- **Apple `Dictionary`**: "A dictionary is a type of hash table, providing fast access to the entries it contains. Each entry in the table is identified using its key, which is a hashable type."
- **TSPL Strings and Characters**: "different characters can require different amounts of memory to store, so in order to determine which `Character` is at a particular position, you must iterate over each Unicode scalar from the start or end of that `String`. For this reason, Swift strings can't be indexed by integer values."
- **SwiftLint pages** (`sorted_first_last`, `first_where`, `last_where`, `contains_over_filter_count`, `contains_over_filter_is_empty`, `flatmap_over_map_reduce`, `empty_count`, `empty_collection_literal`): each is "Enabled by default: No" (opt-in), "Kind: performance", with non-triggering examples matching the Good forms (`min()`/`max()`, `first(where:)`, `last(where:)`, `contains(where:)`, `flatMap`, `isEmpty`) and triggering examples matching the Bad forms (`sorted().first/.last`, `filter{}.first/.last`, `filter{}.count`, `filter{}.isEmpty`, `map{}.reduce([], +)`, `count == 0`, `== []`/`== [:]`), including the chained-transformation cases the rules mention.

## Compile results

- `swiftc -typecheck` default and `-swift-version 6`: **96/96 exit 0** (48 snippets x 2 modes), no diagnostics. No rule uses `compile_exempt`.
- The deterministic validator's Swift harness only runs `swiftc -parse`; the `-typecheck` pass above is the stronger check.
- All snippets are <= 20 lines (cap 25); all are complete at declaration level (the `perf` snippets are top-level statements, executable as `main.swift`; the `async` snippets are declaration-level and were also driven by the harnesses).

## noasync assessment (the two blocking-call Bads)

- Direct probe (Swift 6.4): `Thread.sleep(forTimeInterval:)` and `DispatchSemaphore.wait()` called directly inside an `async` function -> warning in default mode with "this is an error in the Swift 6 language mode"; **error** under `-swift-version 6` ("class method 'sleep' is unavailable from asynchronous contexts; Use Task.sleep(until:clock:) instead." / "instance method 'wait' is unavailable from asynchronous contexts; Await a Task handle instead").
- Both Bads (`async-no-blocking`, `async-task-sleep`) call the primitive through a synchronous helper (`waitForReadyBlocking()`, `sleepBlocking()`), which the compiler cannot see through; they typecheck in both modes. That is precisely what both Whys claim ("a synchronous helper that blocks can still be called from async code"), so the anti-pattern is valid and the compiler-escalation statement is accurate. The Good forms avoid the primitive (`await ready.value`, `await Task.sleep(for:)`).

## Behavior harness results (all bounded, both language modes)

- **Overload resolution**: sync context selects the sync overload, async context selects the async overload (`sync` / `async`) - matches SE-0296.
- **Protocol async**: both a synchronous witness and an async witness satisfy `func load() async throws -> String`.
- **Adapters**: custom `AsyncSequence` yields `[1, 2, 3]`; `AsyncStream` yields `[4, 5, 6]`; `AsyncThrowingStream` propagates `finish(throwing:)`; a callback-driven monitor bridged with `AsyncStream` yields `["quake-1", "quake-2"]`.
- **Stream termination**: cancelling the consuming task fires `onTermination` (flag set) and the handler cancels the producer task.
- **Structured vs unstructured**: the structured version returns `["work-done", "structured-returned"]`; the unstructured version returns with only `["unstructured-returned"]` and the work lands later (`["unstructured-returned", "work-done"]`); a cancelled `Task` handle produces no work.
- **Task.sleep**: a cancelled sleep returns via `CancellationError`; a 10 ms sleep completes in < 1 s (non-blocking).
- **Buffering**: unbounded policy buffers all 1000 yields; `.bufferingNewest(10)` retains exactly the newest 10 (`991...1000`).
- **Continuation wrapper**: `withCheckedThrowingContinuation` returns `"user-7"` and propagates the error case.
- **Perf behavior**: all 12 Bad/Good pairs compiled with `-O` and executed; outputs are semantically identical. The only textual difference is `reduce-into` dictionary print order between the two binaries; an explicit harness asserts `byLetterBad == byLetterGood`, so the pair is behavior-preserving. (`string-index`, `remove-first`, etc. print the same values.)

## SwiftLint probes (0.65.1, `--only-rule`, per-file)

| rule id probed | Bad violations | Good violations |
|---|---|---|
| `sorted_first_last` | 1 | 0 |
| `first_where` | 1 | 0 |
| `last_where` | 1 | 0 |
| `contains_over_filter_count` | 1 | 0 |
| `contains_over_filter_is_empty` | 0 (pair uses the `.count` form) | 0 |
| `flatmap_over_map_reduce` | 1 | 0 |
| `empty_count` | 1 | 0 |
| `empty_collection_literal` | 0 (pair uses the `.count` form) | 0 |

Supplementary probes for the two patterns not exercised by the pairs: `values.filter { ... }.isEmpty` -> 1 `contains_over_filter_is_empty` violation; `myArray == []` -> 1 `empty_collection_literal` violation. Every `tool:` id is real, opt-in, and fires on the intended pattern.

## Formatting, validator, duplicates, links

- All 24: id/path match, required frontmatter present, `lang: swift`, `baseline: latest`, valid severity/enforce values, exact section order (`Why`, `Bad`, `Good`, `See Also`), exactly one `swift` fence per Bad/Good, summaries <= 30 words with no hedging, no TODO/elision/Unicode-ellipsis, no duplicate titles or summaries.
- `related` ids (including `swift-conc-continuation-once`, `swift-mem-nscache`, `swift-err-cancellation-*`, `swift-conc-*`) and all `## See Also` targets resolve; no duplicate ids in the pack.
- Duplicates: no duplicate or near-duplicate pair. Closest siblings read and confirmed distinct: `async-api-not-completion` (new API shape) vs `async-protocol-async` (protocol requirement) vs `async-continuation-wrapper` (adapter for an existing callback API); `async-sequence-over-callbacks` (designing a new stream-shaped API) vs `async-stream-adapter` (bridging an existing callback API); `async-stream-buffering` vs `async-stream-termination` (bound vs cleanup); `async-task-sleep` vs `async-no-blocking` (sleep vs blocking wait); `async-task-handle` vs `async-structured-not-task` (keep handle vs await directly); `perf-first-where` vs `perf-last-where` vs `perf-contains-over-filter` (value of first match vs last match vs existence); `perf-lazy-chain` vs `perf-reduce-into` vs `perf-flatmap-map-reduce` (avoid intermediates vs inout accumulator vs flatten). Same-basename rules in other packs are the contract's per-language versions, not duplicates (no identical titles anywhere in the catalog).
- Validator (`node dist/rules/cli.js validate --lang swift --json`) at completion: the 24 batch files contribute **0 errors / 0 warnings** (checkedCount 204, the pack had grown to 205 rules through concurrent batch work). The single pack error at report time is `related-unresolved` in `anti-class-delegate-protocol.md` (concurrent batch, outside this scope).

## Non-blocking notes

- `async-no-blocking`: the Why's closing sentence ("the cooperative thread pool has a fixed width ... the pool can stall") is not verbatim in SE-0296; it is accurate standard Swift-concurrency behavior (SE-0304 refers to a "shared, limited-concurrency pool"; TSPL describes the cooperative model), while the decision itself and the condition-variable sentence are directly sourced. The same applies to `async-task-sleep`'s `Thread.sleep` contrast (the Apple page documents only `Task.sleep`). Worth tightening sourcing later; not blocking.
- `async-stream-adapter`: the Good constructs a fresh `QuakeMonitor` inside the builder (as SE-0314's own example does) rather than observing the receiver of the extension; faithful to the cited example, though an author note could clarify.
- `perf-empty-check`: the Bad uses an `Array` (where `count` is O(1)); the Why explicitly covers the non-`RandomAccessCollection` case, so the general claim stands.
- `INDEX.md` is stale for this batch (it still shows the pre-flip verified count); per ownership the verifier did not touch it - index owner's action.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| swift-async-api-not-completion | verified | SE-0296 problems 1-4 + TSPL nested-closure example; both modes typecheck |
| swift-async-continuation-wrapper | verified | SE-0314 single-result continuation adapters + `resume(with:)`; harness returns value and propagates error; both modes |
| swift-async-no-blocking | verified | SE-0296 "avoid calling functions that can actually block the thread" + condition-variable sentence; direct-call probe warns/errors as claimed, helper form compiles; both modes |
| swift-async-overload-sync | verified | SE-0296 overload-resolution rule + C# `Async` suffix alternative; harness: sync/async contexts pick the matching overload; both modes |
| swift-async-protocol-async | verified | SE-0296 "can be satisfied by an `async` or synchronous function"; harness: sync witness satisfies; both modes |
| swift-async-sequence-over-callbacks | verified | SE-0298 many-values purpose + notification/delegate/multi-callback adoption intent; harness iterates a custom `AsyncSequence`; both modes |
| swift-async-stream-adapter | verified | SE-0314 multi-value bridging, `yield`, `finish(throwing:)`; harness bridges callback monitor to `["quake-1","quake-2"]`; both modes |
| swift-async-stream-buffering | verified | SE-0314 default buffering + `bufferingNewest`/limit-0 semantics; harness: unbounded 1000 vs newest 10 `[991...1000]`; both modes |
| swift-async-stream-termination | verified | SE-0314 `onTermination` cleanup sentence; harness: cancellation fires handler and cancels producer; both modes |
| swift-async-structured-not-task | verified | SE-0304 child waits/cancellation/priority + TSPL unstructured responsibility; harness shows early return and late work; both modes |
| swift-async-task-handle | verified | TSPL "returns a task that you can interact with ... wait for its result or to cancel it"; harness: cancelled handle produces no work; both modes |
| swift-async-task-sleep | verified | Apple `Task.sleep`: suspends, throws on cancellation, doesn't block; harness confirms both; direct-call probe warns/errors as claimed; both modes |
| swift-perf-contains-over-filter | verified | SwiftLint pages + probe (1 Bad / 0 Good); Bad/Good outputs equal; both modes |
| swift-perf-dictionary-lookup | verified | Apple Dictionary hash-table quote; Bad/Good outputs equal; both modes |
| swift-perf-empty-check | verified | Apple `isEmpty` quote + SwiftLint `empty_count`/`empty_collection_literal` probes; both modes |
| swift-perf-first-where | verified | SwiftLint `first_where` page + probe; chained-transformation case documented; both modes |
| swift-perf-flatmap-map-reduce | verified | SwiftLint `flatmap_over_map_reduce` page + probe; outputs equal `[1, 2, 3]`; both modes |
| swift-perf-last-where | verified | SwiftLint `last_where` page + probe; both modes |
| swift-perf-lazy-chain | verified | Apple `Array.lazy` quote; outputs equal; both modes |
| swift-perf-reduce-into | verified | Apple `reduce(into:)` "preferred over `reduce(_:_:)`" quote; explicit equality harness; both modes |
| swift-perf-remove-first | verified | Apple `removeFirst(_:)` O(n) + index invalidation quote; outputs equal; both modes |
| swift-perf-set-membership | verified | Apple `Set` membership quote; outputs equal; both modes |
| swift-perf-sorted-first-last | verified | SwiftLint `sorted_first_last` page + probe; outputs equal; both modes |
| swift-perf-string-index | verified | TSPL Strings quote (memory, scalar iteration, no integer indexing); outputs equal; both modes |

## Counts

- Verified: **24/24** (`async` 12/12, `perf` 12/12)
- Rejected: **0/24**
- Blockers: none

Only the 24 `status:` fields and this report were changed; no rule bodies, titles, or sources were touched. No git operations were performed.
