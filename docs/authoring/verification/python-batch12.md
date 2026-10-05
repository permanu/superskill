# Verification Report - Python Batch 12 (`async` 4, `test` 2, `sec` 2)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/python/async-semaphore-bound.md`, `async-debug-mode.md`, `async-queue-join.md`, `async-wait-first.md`, `test-async-isolated.md`, `test-mock-assertions.md`, `sec-archive-extract-filter.md`, `sec-bound-input-size.md` = 8 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`python3` on PATH, `/opt/homebrew/opt/python@3.14/bin/python3.14`), macOS; sources fetched live (Python 3.14.8 docs: `asyncio-sync`, `asyncio-dev`, `asyncio-queue`, `asyncio-task`, `unittest`, `unittest.mock`, `tarfile`, `shutil`, `tomllib`; plus PEP 655)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/batch12`
- Ownership: flipped `status` to `verified` on 7 of 8 rules; `async-debug-mode` left `draft` (reason below). No other edits; no git. Batches 9-11 files untouched.

## Method

- Fetched all 9 distinct cited URLs (all resolve, HTTP 200) and located the supporting sentences for every Why claim in the fetched text. PEP 655 (listed in the batch instructions but cited by no batch-12 rule; it backs `type-typeddict-notrequired`, another batch) was fetched anyway: resolves, historical-PEP notice, `NotRequired`/`total=False` content present.
- Extracted both snippets from all 8 rules (16 files) and ran `python3 -m py_compile` on each with CPython 3.14.6: 16/16 pass.
- Ran every safe snippet through purpose-built behavior drivers with short timeouts: semaphore-bounded fan-out, debug mode toggle + slow-callback logging, queue join/task_done, `wait(FIRST_COMPLETED)` with staggered delays, `IsolatedAsyncioTestCase`, mock assertion diagnostics, `tarfile` filter=`"data"` traversal rejection, size-bound `ValueError`. All pass (evidence below). No network use by the drivers; all writes inside scratch.
- Cross-checked frontmatter, ids, `baseline: latest`, section order, exactly two `python` fences, summary word limits, anti-slop tokens (`...`/TODO/FIXME/XXX/TBD), no version numbers in rule text, `related` id resolution, See Also targets, and duplicates inside the batch and against the whole Python pack.
- Ran the deterministic validator (`node dist/rules/cli.js validate --lang python --json`): 0 errors, 287/287 rules checked; the only 3 warnings are outside this batch (`anti-percent-format`, `obs-perf-counter-durations`).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-async-semaphore-bound | verified | asyncio-sync: "A semaphore manages an internal counter which is decremented by each acquire() call ... when acquire() finds that it is zero, it blocks, waiting until some task calls release()"; "The preferred way to use a Semaphore is an async with statement: sem = asyncio.Semaphore(10) ... async with sem: # work with shared resource". asyncio-task gather: "Run awaitable objects in the aws sequence concurrently. If any awaitable in aws is a coroutine, it is automatically scheduled as a Task." Probe: 8 concurrent workers peak at 8 un-bounded vs 2 with `Semaphore(2)`. |
| python-async-debug-mode | **rejected** | See "Rejected rule" below. |
| python-async-queue-join | verified | asyncio-queue: "Block until all items in the queue have been received and processed. The count of unfinished tasks goes up whenever an item is added ... The count goes down whenever a consumer coroutine calls task_done()"; worker example confirmed: `await queue.join()` then "# Cancel our worker tasks" + gather. Probe: join returns after all 3 items processed; the `empty()`-loop Bad leaves item 2 unconsumed (`qsize=1`, consumed `[1]`). |
| python-async-wait-first | verified | asyncio-task: `asyncio.wait(aws, *, timeout=None, return_when=ALL_COMPLETED)`; `FIRST_COMPLETED` — "The function will return when any future finishes or is cancelled"; "Returns two sets of Tasks/Futures: (done, pending)". Probe with delays 0.05s/0.5s: FIRST_COMPLETED returns `["a"]` in 0.054s; default `wait()` takes 0.501s. |
| python-test-async-isolated | verified | unittest: `IsolatedAsyncioTestCase` "provides an API similar to TestCase and also accepts coroutines as test functions"; `run()` "Sets up a new event loop to run the test". Probe: 3 tests pass; two async tests observe distinct loop objects (`assertIsNot`); `asyncSetUp`/`asyncTearDown` hooks run. |
| python-test-mock-assertions | verified | unittest.mock: "Assert that the mock was called exactly once and that call was with the specified arguments" (`assert_called_once_with`); `assert_called_with` and `assert_any_call` present in the same family. Probe: helper raises with "Expected: mock('wrong') / Actual: mock('ready')" and catches a double call; both snippets pass on matching calls. |
| python-sec-archive-extract-filter | verified | tarfile: "Warning Never extract archives from untrusted sources without prior inspection"; "It is recommended to set this explicitly ... or as filter='data' to support Python versions with a less secure default (3.13 and lower)"; `'data'` filter "Ignore or block most features specific to UNIX-like filesystems"; `AbsolutePathError`/`OutsideDestinationError`/`AbsoluteLinkError`/`LinkOutsideDestinationError`. shutil repeats the untrusted-archive warning for `unpack_archive`. Probe: `filter="data"` rejects `../../escaped.txt` with `OutsideDestinationError`; safe archive extracts. |
| python-sec-bound-input-size | verified | tomllib: "Be cautious when parsing data from untrusted sources. A malicious TOML string may cause the decoder to consume considerable CPU and memory resources. Limiting the size of data to be parsed is recommended." Probe: 64 KiB+1 input raises `ValueError("config too large")`; the unbounded version accepts 65,538 bytes. |

## Rejected rule

**python-async-debug-mode** - the Why attributes a claim to the cited source that the current source no longer makes.

- The rule's Why states: "The asyncio development docs state that debug mode makes asyncio check for coroutines that were not awaited and log them". The current 3.14 docs' debug-mode bullet list contains only: non-threadsafe API exceptions, I/O selector timing, and slow callbacks ("Callbacks taking longer than 100 milliseconds are logged"). The never-awaited bullet was present in the 3.11/3.12 docs ("asyncio checks for coroutines that were not awaited and logs them; this mitigates the 'forgotten await' pitfall") but was removed in 3.13 and is absent in 3.13/3.14.
- The same page's "Detect never-awaited coroutines" section shows the `RuntimeWarning` is emitted **without** debug mode; "Output in debug mode" only adds the creation traceback ("Coroutine created at (most recent call last) ..."). Empirical probe: identical `RuntimeWarning: coroutine 'never_awaited' was never awaited` with and without `set_debug(True)`.
- Consequently the summary ("it logs un-awaited coroutines and slow callbacks") also misattributes detection to debug mode. The rule's decision (enable debug mode in development) is still sound on the other two documented bullets, and everything else passes: both snippets compile; `set_debug(True)`/`asyncio.run(debug=True)` behavior and slow-callback logging (0.156s callback logged) pass; format/links/duplicates clean.
- Suggested fix (one sentence + summary): reword to the current docs, e.g. "debug mode logs slow callbacks and enriches never-awaited coroutine warnings with the creation traceback; it is enabled by `loop.set_debug()`, `PYTHONASYNCIODEBUG=1`, or `debug=True`". No other change needed; re-submit for verification.

## Cross-cutting checks

- Sources: 9/9 distinct cited URLs fetch successfully (HTTP 200); every verified rule's central claim was located in the fetched text (verbatim or faithful paraphrase). Every rule cites at least one primary source.
- Compile: 16/16 snippets pass `python3 -m py_compile` on CPython 3.14.6; both fences tagged `python`; no elisions, placeholders, or hedging.
- Behavior: all named cases pass; exact Good snippets for `async-wait-first` and `async-queue-join` run standalone with rc 0 and no shutdown warnings.
- Formatting: deterministic validator reports 0 errors for the pack; no batch-12 finding. Heading order correct, `baseline: latest` everywhere, summaries 10-15 words, no version numbers in rule text.
- Links/ids: all `related` ids resolve (0 unresolved); all See Also targets exist (0 mismatches); ids match paths.
- Duplicates: no collisions inside the batch or against the Python pack. Near-candidates reviewed and distinct: `async-semaphore-bound` vs `async-primitives` (asyncio vs threading primitives) and `async-queue-backpressure`; `async-wait-first` vs `async-gather-inspect`; `async-queue-join` vs `async-queue-backpressure`; `test-async-isolated` vs `test-isolation`; `test-mock-assertions` vs `test-mock-autospec` (assertion helpers vs autospec interface; the autospec rule also calls `assert_called_once_with`, but its decision is the spec); `sec-archive-extract-filter` vs `sec-path-containment`; `sec-bound-input-size` vs `const-tomllib-binary` and `io-iterate-lines`.

## Non-blocking notes

- `sec-archive-extract-filter`: on 3.14 the interpreter default filter is already `data`, so the Bad snippet's blind `extractall` no longer escapes on the baseline (probe: it raises `OutsideDestinationError` too); the Why states the version condition ("for versions with a less secure default") and the docs explicitly recommend setting `filter='data'` for 3.13-and-lower support, so the rule's decision stands as the documented explicit practice. The summary's "without it a crafted member writes outside the target" holds for interpreters with the less secure default.
- `async-wait-first`: the Good snippet cancels the pending task without awaiting it; the exact snippet runs clean because `asyncio.run` cancels and drains pending tasks at shutdown. Acceptable for a declaration-level example; awaiting the cancelled tasks would be slightly stricter in a long-lived loop.
- `async-debug-mode` stays `draft` and remains pull-only; the INDEX status line (`Rules: 287 (verified: 253)`) and its batch-12 note are now stale after these flips; updating the index is outside verifier ownership.

## Counts

- Verified: 7/8 (`async` 3, `test` 2, `sec` 2)
- Rejected: 1 (`python-async-debug-mode`)
- Blockers: none

Addendum (2026-10-05): `python-async-debug-mode` was reworked (Why/summary now match the current 3.14 docs — the never-awaited `RuntimeWarning` is emitted without debug mode while debug mode adds the creation traceback, plus the documented slow-callback, slow-I/O-selector and wrong-thread behaviors and the logger/ResourceWarning recommendations) and re-verified: both snippets compile, the debug-mode behavior and the creation-traceback output reproduce on CPython 3.14.6, formatting/links clean — flipped to `verified`. Final count: 8/8 verified, 0 rejected.
