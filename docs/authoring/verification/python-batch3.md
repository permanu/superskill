# Verification Report - Python `perf`/`test` Batch 3

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: `catalog/rules/python/perf-*.md` (12) + `catalog/rules/python/test-*.md` (15) = 27 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`/opt/homebrew/bin/python3`), macOS; cited docs fetched 2026-10-05
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/py-batch3` (17 fetched sources, 54 snippets, 28 probes)
- Batch 2 (`type-*`/`async-*`) was not touched.

## Method

- Fetched all 17 distinct cited URLs (all HTTP 200) and captured supporting quotes.
- Extracted both snippets from each rule (54 files) and compiled each with `python3 -m py_compile` on CPython 3.14.6.
- Ran 28 behavioral probes in scratch (no network, no writes outside scratch, no long sleeps) plus a 4-run warning-filter matrix: deque endpoint timing, set membership timing, sort-key call counts and stability, generator laziness, defaultdict counting, nlargest vs full sort, cache pinning via `weakref`, `timeit.repeat` on a callable, `cProfile` cumulative ordering, subtest failure reporting, `addCleanup` on failing `setUp`, `TemporaryDirectory` cleanup, autospec arity, patch-where-looked-up, `assertWarns` under `ignore`/`error` filters, `assertLogs` capture, float equality, doctest execution, blind `assertRaises` passing for a wrong exception, order dependence, import-time failure.
- Cross-checked: frontmatter, id/path match, `related`/`## See Also` resolution, body order, one `python` fence per `Bad`/`Good`, snippet length, summary/Why lengths, triggers, no version tokens/hedges/elisions, duplicate scan, INDEX.md parity, Ruff ids against official docs.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-perf-cache-methods | verified | functools: "If a method is cached, the self instance argument is included in the cache"; Ruff B019: "the global cache will retain a reference to the instance, preventing it from being garbage collected". Compile OK. Weakref probe: lru_cache instance still alive after `del`; cached_property instance collected. |
| python-perf-timeit-benchmark | verified | timeit: "the min() of the result is probably the only number you should be interested in"; "temporarily turns off garbage collection during the timing"; callables accepted as `stmt`. Compile OK. `timeit.repeat(callable, number=1000, repeat=5)` returns the min. |
| python-perf-comprehension-build | verified | Ruff PERF401: "List comprehensions are more readable and more performant" and its own example is the same filtered-append shape; tutorial: "concise way to create lists"; PERF401 documents `extend` for existing lists. Compile OK. Bad and Good both return `[1, 9, 25]`. |
| python-perf-generator-stream | verified | Functional HOWTO: genexps "compute the values as necessary, not needing to materialize all the values at once ... infinite stream or a very large amount of data. Generator expressions are preferable in these situations." Compile OK. Probe: Bad materialized 10 items before first use; Good produced 1. |
| python-perf-defaultdict-count | verified | collections: "This technique is simpler and faster than an equivalent technique using dict.setdefault()"; Counter documents `most_common`, `total`, and multiset arithmetic. Compile OK. Counts identical to the get-loop. |
| python-perf-cprofile-hotspots | verified | profile docs: "Internal time statistics can be used to identify 'hot loops' ... Cumulative time statistics should be used to identify high level errors in the selection of algorithms." Compile OK. `print_stats(SortKey.CUMULATIVE)` prints "Ordered by: cumulative time". |
| python-perf-profile-first | verified | profile docs describe deterministic profiling and time attribution; timeit docs support comparing alternatives. Compile OK. `runctx` probe printed stats containing `normalize`. |
| python-perf-cache-pure | verified | functools: cache is "Simple lightweight unbounded function cache"; maxsize `None` "can grow without bound"; "doesn't make sense to cache functions with side-effects ... or impure functions such as time() or random()". Compile OK. fib(25)=75025 with cache hits > 0. |
| python-perf-deque-endpoints | verified | collections: deque has "approximately the same O(1) performance in either direction"; list "incur O(n) memory movement costs for pop(0)"; tutorial points queues at `collections.deque`. Compile OK. N=4000: `pop(0)` 1.07 ms vs `popleft` 0.14 ms, same result. |
| python-perf-sort-key | verified | Sorting HOWTO: "the key function is called exactly once for each input record"; `cmp_to_key` for comparison functions supplied by libraries. Compile OK. 500 records: 500 key calls vs 1742 cmp calls; stability holds. |
| python-perf-set-membership | verified | tutorial: "'orange' in basket # fast membership testing" and "Basic uses include membership testing"; set built once before the loop. Compile OK. N=2000x1000: list scan 12.75 ms vs set 0.07 ms. |
| python-perf-partial-sort | verified | Sorting HOWTO Partial Sorts: nlargest/nsmallest "make a single pass ... keeping only n elements ... far fewer comparisons than a full sort"; min/max for n=1. Compile OK. `nlargest(3)` equals the full-sort slice. |
| python-test-warn-contract | verified | unittest: assertWarns "works regardless of the warning filters in place when it is called". Compile OK. Bad passes under `-m unittest` (which sets `simplefilter('default')`) but fails under `-W ignore::DeprecationWarning` (0 != 1) and errors under `-W error::DeprecationWarning`; Good passes under both. |
| python-test-isolation | verified | unittest: testing code "should be entirely self contained ... run either in isolation or in arbitrary combination"; "Each instance of TestCase will run a single base method". Compile OK. Bad passes in order but errors when run alone; Good passes both. |
| python-test-temp-dir | verified | tempfile: TemporaryDirectory "securely creates a temporary directory ... On completion of the context ... the newly created temporary directory and all its contents are removed from the filesystem." Compile OK. Probe: directory removed after the context. Bad literal not run (fixed `/tmp` write outside scratch). |
| python-test-assert-raises-specific | verified | unittest `assertRaises`; Ruff B017: "Checks for assertRaises ... context managers that catch Exception or BaseException", and B017 is in the official Default Rules select. Compile OK. Blind `assertRaises(Exception)` passed while code raised `TypeError`; the specific `ValueError` test errored on it. |
| python-test-discovery-layout | verified | unittest: "All test modules must be importable from the top level of the project"; import failures are "recorded as a single error"; docs list advantages of separate test modules. Compile OK. Bad module raises FileNotFoundError at import; Good imports. |
| python-test-one-behavior | verified | unittest: test cases are "single scenarios"; one method per instance; pyguide 3.16.2 names `test<MethodUnderTest>_<state>` and 3.8.2.1 omits docstrings that repeat the method name. Compile OK. Bundled test reported 1 failure for 2 broken behaviors; split tests reported 2. |
| python-test-log-contract | verified | unittest assertLogs: "The test passes if at least one message emitted inside the with block matches the logger and level conditions, otherwise it fails"; `records`/`output` attributes. Compile OK. Good captures "INFO:app.audit:login user=alice"; Bad passes with zero assertions. |
| python-test-skip-reason | verified | unittest documents @skip/@skipIf/@skipUnless with a reason and shows the exact `@unittest.skipUnless(sys.platform.startswith("win"), "requires Windows")` form. Compile OK. Bad early return counted as pass (skipped=0); Good reported skipped=1 with the reason. |
| python-test-subtests-loop | verified | unittest subtests section: "unittest allows you to distinguish them inside the body of a test method using the subTest() context manager" and the docs example reports each failure separately. Compile OK. Bad reported 1 failure; Good reported 3 (cases 1, 3, 5). |
| python-test-mock-where-looked-up | verified | mock docs: "you patch where an object is looked up, which is not necessarily the same place as where it is defined", with the `from a import SomeClass` example matching the Bad. Compile OK. `patch("time.time")` left the module-local reference real (Bad fails); patch of the using module passes. |
| python-test-exception-attributes | verified | unittest: "The context manager will store the caught exception object in its exception attribute." Compile OK. Type-only assertion passed for a different ValueError message; Good asserted `str(caught.exception)`. |
| python-test-float-close | verified | unittest assertAlmostEqual: "computing the difference, rounding to the given number of decimal places (default 7), and comparing to zero". Compile OK. `sum([0.1,0.2,0.3])/3` = 0.19999999999999998 fails exact equality, passes `places=7`. |
| python-test-mock-autospec | verified | mock docs: "Auto-speccing creates mock objects that have the same attributes and methods ... same call signature ... ensures that your mocks will fail in the same way as your production code if they are used incorrectly." Compile OK. Plain Mock accepted 3 args; `create_autospec` raised `TypeError: too many positional arguments`. |
| python-test-addcleanup | verified | unittest addCleanup: "Functions will be called in reverse order ... If setUp() fails, meaning that tearDown() is not called, then any cleanup functions added will still be called." Compile OK. Probe: failing `setUp` ran the cleanup and not `tearDown`. |
| python-test-doctest-runnable | verified | doctest: "searches for pieces of text that look like interactive Python sessions, and then executes those sessions to verify that they work exactly as shown." Compile OK. Bad example failed 1/1; Good failed 0/1. |

## Cross-cutting checks

- Compile: 54/54 snippets pass `python3 -m py_compile` on CPython 3.14.6 (max snippet 17 lines).
- Sources: 17/17 cited URLs fetched HTTP 200 and support the rules' decisions; notes below cover non-verbatim rationale.
- Behavior: 28/28 probes pass, plus the warning-filter matrix above.
- Formatting: all 27 follow the contract body order with exactly one `python` fence per `Bad`/`Good`; summaries <= 30 words; Why 2-5 sentences; no version tokens, hedges, or bare/Unicode elisions. The inline `tuple[str, ...]` annotation is normal syntax, not an elision.
- Links/ids: id matches path for all 27; every `related` id resolves to a file whose id matches; every `## See Also` link resolves; INDEX.md lists all 27 (101/101 directory parity).
- Duplicates: no duplicate or near-duplicate pairs. Overlapping pairs (cache-pure/cache-methods, profile-first/cprofile-hotspots, timeit-benchmark/profile-first, comprehension-build/generator-stream, sort-key/partial-sort, set-membership/defaultdict-count, warn-contract/log-contract, assert-raises-specific/exception-attributes, isolation/one-behavior, mock-where-looked-up/mock-autospec) state distinct decisions and cross-reference each other.
- Ruff ids (official docs): `PERF401` manual-list-comprehension, `B017` assert-raises-exception, `B019` cached-instance-method all exist and match their rules; B017 and B019 also appear in the official Default Rules select, supporting the "by default" wording in `test-assert-raises-specific`.

## Notes / follow-ups (outside verifier ownership)

- INDEX.md still reports `verified: 16` (batch-1 count); stale after these flips, but its file list already matches the directory.
- The Google Python Style Guide no longer has a Testing section (also absent in 2023/2024 archives). `test-one-behavior`'s naming/docstring support is still present at 3.16.2 and 3.8.2.1, and the one-behavior half is backed by unittest's "single scenarios" wording; not blocking.
- `perf-timeit-benchmark` says timeit "picks the repetition count": docs scope automatic loop-count selection to the CLI (and `autorange`), not the default Python API; the Good snippet uses an explicit number, so the rule is correct as written.
- `test-log-contract` says "without touching handlers": `assertLogs` swaps and restores the target logger's handlers internally; the sentence is accurate at the test-author level.
- `test-float-close` mentions `math.isclose` (uncited but accurate); `perf-set-membership`'s O(1)-average wording is the standard hashing property behind the tutorial's "fast membership testing".
- `test-temp-dir`'s Bad snippet was not run literally because it writes to a fixed `/tmp` path outside the scratch constraint.

## Counts

- Verified: 27/27
- Rejected: 0
- Blockers: none
