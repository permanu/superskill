# Python Rules Index

Baseline: latest
Rules: 287 (verified: 287)

Plan complete: 287/287 rules authored across 21 categories. Verified: 286. In verification: `num-math-fsum` (1 fix).

## anti - Anti-patterns (14)

- [anti-bool-equality](anti-bool-equality.md) - Test booleans directly; == True and == False add a comparison that reads worse.
- [anti-call-default](anti-call-default.md) - Do not call functions in default arguments; the call runs once at definition time, not per call.
- [anti-dict-keys-membership](anti-dict-keys-membership.md) - Test dict membership on the dict itself; .keys() adds a call with the same semantics.
- [anti-else-after-return](anti-else-after-return.md) - Drop the else after a branch that returns; the else adds a nesting level for nothing.
- [anti-empty-len](anti-empty-len.md) - Test emptiness with the value itself; len(seq) == 0 is longer and slower to read.
- [anti-is-literal](anti-is-literal.md) - Compare values with ==; is tests identity and is wrong for numbers and strings.
- [anti-lambda-assignment](anti-lambda-assignment.md) - Bind functions with def, not lambda assignment; the def form has a name and a traceback.
- [anti-mutable-class-attribute](anti-mutable-class-attribute.md) - Do not put mutable containers on the class; class attributes are shared by every instance.
- [anti-mutable-default](anti-mutable-default.md) - Never use a mutable default argument; the one default object is shared by every call.
- [anti-none-equality](anti-none-equality.md) - Compare to None with is and is not; == None can be overridden and hides intent.
- [anti-percent-format](anti-percent-format.md) - Format strings with f-strings; percent formatting separates the template from its values.
- [anti-range-len](anti-range-len.md) - Iterate with enumerate; range and len index the sequence when it can yield values directly.
- [anti-type-equality](anti-type-equality.md) - Test types with isinstance, not type equality; exact-type checks reject subclasses and proxies.
- [anti-wildcard-import](anti-wildcard-import.md) - Avoid import *; it hides which names a module uses and overwrites existing bindings.

## api - API and library design (13)

- [api-abc-interface](api-abc-interface.md) - Declare interfaces with abc.ABC and abstractmethod; incomplete subclasses then fail at instantiation.
- [api-all-public](api-all-public.md) - Declare the public names in __all__; the export list is then explicit and introspectable.
- [api-bool-params](api-bool-params.md) - Keep boolean parameters keyword-only; a bare True at a call site documents nothing.
- [api-context-manager](api-context-manager.md) - Make resource-owning types work with with statements; callers then get release on every exit path.
- [api-deprecation-warning](api-deprecation-warning.md) - Announce removals with DeprecationWarning and stacklevel=2 so callers see the warning at their line.
- [api-enum-closed-set](api-enum-closed-set.md) - Model closed sets with Enum members; bare strings accept typos the code never handled.
- [api-import-side-effects](api-import-side-effects.md) - Keep work out of import time; guard executable code behind __main__.
- [api-iterable-parameters](api-iterable-parameters.md) - Type parameters as the abstract interface they use; list annotations reject tuples and generators.
- [api-keyword-only](api-keyword-only.md) - Make optional parameters keyword-only; call sites read better and new parameters do not shift positions.
- [api-pathlike](api-pathlike.md) - Accept os.PathLike in path parameters; str-only APIs force callers to stringify Path objects.
- [api-return-copy](api-return-copy.md) - Return a copy of internal mutable state; returning the attribute lets callers mutate behind the API.
- [api-singledispatch](api-singledispatch.md) - Dispatch on type with functools.singledispatch instead of an isinstance ladder.
- [api-timeout-parameter](api-timeout-parameter.md) - Give blocking operations an explicit timeout; a call with no timeout can hang the caller forever.

## async - Asyncio and structured concurrency (20)

- [async-aclosing-generators](async-aclosing-generators.md) - Close async generators with contextlib.aclosing when leaving early.
- [async-await-coroutines](async-await-coroutines.md) - Await or schedule every coroutine; calling a coroutine function starts nothing.
- [async-contextvars](async-contextvars.md) - Keep per-task state in contextvars so concurrent tasks do not share it.
- [async-debug-mode](async-debug-mode.md) - Enable asyncio debug mode in development; slow callbacks are logged and stray coroutines gain creation tracebacks.
- [async-gather-inspect](async-gather-inspect.md) - With gather(return_exceptions=True), inspect every result before treating the batch as done.
- [async-no-global-loop](async-no-global-loop.md) - Resolve the event loop per call with get_running_loop; never cache one globally.
- [async-no-time-sleep](async-no-time-sleep.md) - Never call time.sleep in a coroutine; await asyncio.sleep so other tasks run.
- [async-offload-blocking](async-offload-blocking.md) - Offload blocking I/O with asyncio.to_thread so the event loop keeps running other tasks.
- [async-offload-cpu](async-offload-cpu.md) - Send CPU-bound work to process or interpreter pools; threads still serialize on the GIL.
- [async-primitives](async-primitives.md) - Synchronize tasks with asyncio.Lock and friends; threading primitives block the loop.
- [async-queue-backpressure](async-queue-backpressure.md) - Give every producer/consumer Queue a maxsize so producers cannot outrun consumers.
- [async-queue-join](async-queue-join.md) - Wait for queue completion with join and task_done; polling empty() exits before the last item.
- [async-run-entry](async-run-entry.md) - Run async programs with a single asyncio.run call; it owns loop setup and shutdown.
- [async-semaphore-bound](async-semaphore-bound.md) - Bound concurrent work with asyncio.Semaphore; gather() starts every task at once.
- [async-shield-selectively](async-shield-selectively.md) - Shield only operations that must complete; shielding hides cancellation from the caller.
- [async-task-naming](async-task-naming.md) - Name every long-lived task; anonymous tasks are unidentifiable in traces.
- [async-task-retrieve](async-task-retrieve.md) - Retrieve task results and exceptions; abandoned failures are logged only at collection.
- [async-task-strong-ref](async-task-strong-ref.md) - Keep a strong reference to every background task; the loop only holds weak ones.
- [async-taskgroup-structured](async-taskgroup-structured.md) - Group related tasks in a TaskGroup so failures cancel siblings and aggregate.
- [async-wait-first](async-wait-first.md) - Race tasks with wait(FIRST_COMPLETED) and cancel the losers; the default waits for all.

## conc - Threads, processes, interpreters (13)

- [conc-daemon-graceful](conc-daemon-graceful.md) - Keep work that must finish on non-daemon threads; daemon threads are stopped abruptly at shutdown.
- [conc-event-signaling](conc-event-signaling.md) - Signal between threads with Event; polling a shared flag wakes on a timer, not on the change.
- [conc-future-exceptions](conc-future-exceptions.md) - Call result() on every future; a task's exception stays inside the future until it is retrieved.
- [conc-interpreter-pool](conc-interpreter-pool.md) - Use InterpreterPoolExecutor for CPU-bound work; each interpreter has its own GIL.
- [conc-join-threads](conc-join-threads.md) - Join the threads you start; the program exits when only daemon threads remain, not when work is done.
- [conc-lock-with](conc-lock-with.md) - Hold locks with with statements; manual acquire and release leaks the lock when the body raises.
- [conc-main-guard](conc-main-guard.md) - Guard the entry point with __main__; spawn and forkserver children import the main module.
- [conc-message-passing](conc-message-passing.md) - Pass messages between processes; a module-level list is not shared with the children.
- [conc-pool-context](conc-pool-context.md) - Manage pools with with; an abandoned Pool leaves worker processes running.
- [conc-process-picklable](conc-process-picklable.md) - Give children importable functions and picklable arguments; a lambda or REPL target dies on spawn.
- [conc-queue-exchange](conc-queue-exchange.md) - Move data between threads through a Queue; a bare list is shared state with no locking.
- [conc-spawn-safety](conc-spawn-safety.md) - Start processes with spawn or forkserver; safely forking a multithreaded process is problematic.
- [conc-threadlocal](conc-threadlocal.md) - Keep per-thread state in threading.local; a shared dict keyed by thread id grows and races.

## const - Constants and configuration (5)

- [const-env-snapshot](const-env-snapshot.md) - Read the environment once at startup; os.environ is captured at import and never refreshes.
- [const-module-uppercase](const-module-uppercase.md) - Name module-level constants in UPPERCASE; the case marks the value as fixed.
- [const-regex-compile](const-regex-compile.md) - Compile patterns you reuse into named constants; the module-level functions recompile through a small cache.
- [const-sentinel-object](const-sentinel-object.md) - Use a module-level object() sentinel when None is a valid argument value.
- [const-tomllib-binary](const-tomllib-binary.md) - Open TOML files in binary mode for tomllib; the parser requires a binary file object.

## data - Data handling (14)

- [data-csv-module](data-csv-module.md) - Parse delimited data with csv; split breaks on quoting, escapes, and embedded delimiters.
- [data-csv-newline](data-csv-newline.md) - Open files for csv with newline=''; otherwise quoted newlines break parsing.
- [data-dataclass-frozen](data-dataclass-frozen.md) - Make value objects frozen dataclasses; frozen records are immutable and hashable.
- [data-dataclass-records](data-dataclass-records.md) - Model records as dataclasses; dict keys and tuple positions fail silently.
- [data-dataclass-slots](data-dataclass-slots.md) - Give high-volume dataclasses slots=True to drop per-instance dictionaries.
- [data-datetime-aware](data-datetime-aware.md) - Use aware datetimes in UTC for stored timestamps; naive times are ambiguous.
- [data-decimal-from-string](data-decimal-from-string.md) - Construct Decimal from strings; Decimal(float) imports the float's error.
- [data-decimal-money](data-decimal-money.md) - Use Decimal for money; binary floats cannot represent cents exactly.
- [data-decimal-quantize](data-decimal-quantize.md) - Quantize currency to cents with an explicit rounding mode at the boundary.
- [data-encoding-explicit](data-encoding-explicit.md) - Pass encoding='utf-8' explicitly; the locale default varies by machine.
- [data-json-default](data-json-default.md) - Pass an explicit default to json.dumps for non-JSON types.
- [data-json-sort-keys](data-json-sort-keys.md) - Use sort_keys=True so serialized JSON is stable across runs and diffable.
- [data-sqlite-row-factory](data-sqlite-row-factory.md) - Set row_factory = sqlite3.Row so rows support column names and mapping access.
- [data-sqlite-transactions](data-sqlite-transactions.md) - Wrap writes in the connection context manager; it commits on success and rolls back on error.

## doc - Documentation (12)

- [doc-args-section](doc-args-section.md) - Document each parameter in an Args section with its name and a description.
- [doc-blank-after-summary](doc-blank-after-summary.md) - Separate a multi-line docstring's summary from the body with a blank line.
- [doc-cli-help](doc-cli-help.md) - Fill in argparse description and help text; the generated help is the CLI's documentation.
- [doc-closing-quotes](doc-closing-quotes.md) - Put the closing quotes of a multi-line docstring on their own line.
- [doc-comments-current](doc-comments-current.md) - Update comments with the code; a stale comment is worse than no comment.
- [doc-comments-sentences](doc-comments-sentences.md) - Write comments as complete sentences with a capital letter and a period.
- [doc-docstring-first-statement](doc-docstring-first-statement.md) - Put the docstring first; a string literal after other statements never becomes __doc__.
- [doc-docstring-public](doc-docstring-public.md) - Docstring public modules, classes, and functions; the docstring is the API's help text.
- [doc-module-docstring](doc-module-docstring.md) - Open modules with a docstring describing their contents and usage.
- [doc-raises-section](doc-raises-section.md) - List the exceptions callers can expect in a Raises section.
- [doc-summary-imperative](doc-summary-imperative.md) - Write the summary as an imperative phrase ending in a period.
- [doc-why-not-what](doc-why-not-what.md) - Use comments to explain why, not to narrate what the code plainly does.

## err - Error handling (16)

- [err-asyncio-cancel](err-asyncio-cancel.md) - Never swallow asyncio.CancelledError; run synchronous cleanup and re-raise.
- [err-asyncio-timeout](err-asyncio-timeout.md) - Bound awaited I/O with asyncio.timeout; catch TimeoutError outside the block.
- [err-boundary-errors](err-boundary-errors.md) - Validate external input at the boundary; raise TypeError for wrong types and ValueError for wrong values.
- [err-chain-suppress](err-chain-suppress.md) - Suppress a cause with from None only when the original exception is an implementation detail.
- [err-chain-translate](err-chain-translate.md) - Chain a translated exception to its cause with the from clause.
- [err-context-manager-cleanup](err-context-manager-cleanup.md) - Manage resources with with statements so release runs on every exit path.
- [err-custom-hierarchy](err-custom-hierarchy.md) - Define one public base error per package and derive domain failures from it.
- [err-eafp-attempt](err-eafp-attempt.md) - Attempt the operation and handle its failure; checking first races the check against the act.
- [err-exception-group](err-exception-group.md) - Handle concurrent failures with except* so each error type is matched and the rest still propagate.
- [err-finally-no-control-flow](err-finally-no-control-flow.md) - Never return, break, or continue out of a finally block; it discards the in-flight exception.
- [err-logging-exception](err-logging-exception.md) - Log handled exceptions with logger.exception; logger.error(str(exc)) drops the traceback.
- [err-no-bare-except](err-no-bare-except.md) - Catch the narrowest exception type; use a bare except nowhere.
- [err-reraise-bare](err-reraise-bare.md) - Re-raise the active exception with a bare raise so the original traceback stays intact.
- [err-retry-idempotent](err-retry-idempotent.md) - Retry only operations that are safe to repeat, with a bounded attempt count.
- [err-suppress-narrow](err-suppress-narrow.md) - Suppress only specific, expected errors with contextlib.suppress; never Exception or BaseException.
- [err-warnings-vs-errors](err-warnings-vs-errors.md) - Warn about recoverable conditions; raise for conditions that must stop the operation.

## io - Files, paths, streams (12)

- [io-atomic-replace](io-atomic-replace.md) - Write to a temporary file and os.replace it; in-place writes can leave readers a truncated file.
- [io-binary-mode](io-binary-mode.md) - Open non-text payloads in binary mode; text mode decodes bytes and translates newlines.
- [io-communicate-pipes](io-communicate-pipes.md) - Read subprocess output with communicate or subprocess.run; waiting with a full pipe deadlocks the child.
- [io-copy-file](io-copy-file.md) - Copy files with shutil.copyfile; manual read/write round-trips the payload through Python buffers.
- [io-copytree](io-copytree.md) - Copy directory trees with shutil.copytree; a manual loop misses metadata, permissions, and nested directories.
- [io-glob-patterns](io-glob-patterns.md) - Match files with Path.glob; hand-filtered listings reimplement the pattern language and miss nested matches.
- [io-iterate-lines](io-iterate-lines.md) - Iterate file objects line by line; readlines materializes every line in memory before the loop starts.
- [io-move-cross-device](io-move-cross-device.md) - Move files with shutil.move; os.rename fails across filesystems, where the move needs a copy fallback.
- [io-pathlib-paths](io-pathlib-paths.md) - Build paths with pathlib; string joins and manual separators lose the platform semantics the library provides.
- [io-response-close](io-response-close.md) - Close urlopen responses with a with statement; urlopen returns an object built to be used as a context manager.
- [io-scandir-walk](io-scandir-walk.md) - Iterate directories with os.scandir; DirEntry objects carry the type and stat data gathered while scanning.
- [io-walk-prune](io-walk-prune.md) - Prune os.walk by editing dirnames in place; filtering results after the walk still visits the skipped trees.

## lint - Static analysis and typing configuration (12)

- [lint-compileall-ci](lint-compileall-ci.md) - Run compileall over the package before building; it catches syntax errors the tests never import.
- [lint-config-committed](lint-config-committed.md) - Keep linter settings in a committed config file; flags passed per invocation drift between machines and CI.
- [lint-fix-safe](lint-fix-safe.md) - Automate safe fixes only; unsafe fixes can change runtime behavior and need review.
- [lint-format-check](lint-format-check.md) - Run the formatter in check mode; layout lint rules duplicate what the formatter already fixes.
- [lint-noqa-coded](lint-noqa-coded.md) - Write noqa comments with the specific rule codes; a bare noqa hides every finding on the line.
- [lint-py-typed](lint-py-typed.md) - Add the py.typed marker to typed packages; without it consumers' checkers ignore the annotations.
- [lint-select-explicit](lint-select-explicit.md) - Select rule families explicitly; ALL silently enables every new rule a release adds.
- [lint-suppress-line](lint-suppress-line.md) - Keep suppressions on the triggering line; a file-level noqa hides every future finding in the file.
- [lint-type-check-ci](lint-type-check-ci.md) - Run the type checker in CI; the interpreter never enforces annotations.
- [lint-unused-imports](lint-unused-imports.md) - Remove unused imports; they add import-time work and can hide circular dependencies.
- [lint-unused-noqa](lint-unused-noqa.md) - Enable the unused-noqa check; stale suppressions outlive the findings they were written for.
- [lint-unused-variables](lint-unused-variables.md) - Remove unused local assignments; a dead variable is a mistake or a missing use.

## mem - Memory and resources (12)

- [mem-array-compact](mem-array-compact.md) - Store large homogeneous numeric buffers in array.array; a list boxes every number in its own object.
- [mem-bounded-deque](mem-bounded-deque.md) - Bound recent-history buffers with a deque maxlen; an untrimmed list grows for the life of the process.
- [mem-break-cycles](mem-break-cycles.md) - Break reference cycles with one weak edge; cyclic garbage waits for a collector pass instead of being freed immediately.
- [mem-copy-shallow-default](mem-copy-shallow-default.md) - Default to a shallow copy; deepcopy recurses through everything reachable and can copy far more than intended.
- [mem-exit-stack](mem-exit-stack.md) - Register a dynamic set of resources on one ExitStack; a failure while acquiring later ones still releases the earlier ones.
- [mem-finalize-not-del](mem-finalize-not-del.md) - Register cleanup with weakref.finalize instead of __del__; finalizers run once and do not depend on interpreter internals.
- [mem-finalizer-call](mem-finalizer-call.md) - Release resources by calling the finalizer itself; calling the cleanup function directly lets the finalizer run again at collection.
- [mem-gc-freeze-fork](mem-gc-freeze-fork.md) - Freeze the collector before fork; children then leave the parent's long-lived objects alone and share their pages.
- [mem-resource-warning](mem-resource-warning.md) - Enable ResourceWarning as an error in development; unclosed files and sockets then fail fast instead of leaking silently.
- [mem-tracemalloc-snapshot](mem-tracemalloc-snapshot.md) - Measure growth with tracemalloc snapshots compared per line; a single process total shows only that memory grew.
- [mem-weakref-cache](mem-weakref-cache.md) - Cache large values in a WeakValueDictionary; a strong cache keeps every entry alive for the life of the process.
- [mem-weakref-slots](mem-weakref-slots.md) - Add '__weakref__' to __slots__ when instances need weak references; slots otherwise disable them.

## num - Numbers and floats (6)

- [num-fractions-exact](num-fractions-exact.md) - Use Fraction for exact ratios; float division imports representation error that compounds.
- [num-integer-sqrt](num-integer-sqrt.md) - Take integer square roots with math.isqrt; converting through float loses precision on large ints.
- [num-localcontext-precision](num-localcontext-precision.md) - Change Decimal precision inside localcontext; getcontext().prec mutates thread-wide state.
- [num-math-fsum](num-math-fsum.md) - Sum floats with math.fsum; compensated sum() can still lose precision when a large addend cancels.
- [num-math-isnan](num-math-isnan.md) - Test for NaN with math.isnan; a NaN is not equal to anything, including itself.
- [num-statistics-mean](num-statistics-mean.md) - Compute means with statistics.mean; the hand-rolled form divides by zero and loses type information.

## obs - Observability and logging (13)

- [obs-capture-warnings](obs-capture-warnings.md) - Route warnings into logging so they share the application's event stream.
- [obs-context-contextvars](obs-context-contextvars.md) - Put request context in contextvars and inject it into records with a filter.
- [obs-dictconfig](obs-dictconfig.md) - Configure logging once at the entry point with dictConfig.
- [obs-lazy-formatting](obs-lazy-formatting.md) - Pass logging arguments separately so formatting happens only when the record is emitted.
- [obs-library-null-handler](obs-library-null-handler.md) - Attach only a NullHandler in library code; applications own handler configuration.
- [obs-log-levels](obs-log-levels.md) - Choose levels by their documented meanings; the default threshold is WARNING.
- [obs-module-logger](obs-module-logger.md) - Create one module-level logger with getLogger(__name__) and log through it.
- [obs-no-print](obs-no-print.md) - Reserve print for user-facing output; report events through a logger.
- [obs-perf-counter-durations](obs-perf-counter-durations.md) - Measure durations with time.perf_counter; time.time can jump backward.
- [obs-queue-handler](obs-queue-handler.md) - Move slow handlers off the logging thread with QueueHandler and QueueListener.
- [obs-rotation](obs-rotation.md) - Bound file logs with a rotating handler; a plain file handler grows forever.
- [obs-stacklevel-wrappers](obs-stacklevel-wrappers.md) - Pass stacklevel=2 in logging wrappers so records point at the caller.
- [obs-stderr-stream](obs-stderr-stream.md) - Send logs to stderr; stdout belongs to the program's data output.

## pat - Composition and design patterns (8)

- [pat-default-factory](pat-default-factory.md) - Build mutable dataclass defaults with default_factory; literal mutable defaults are rejected.
- [pat-entry-points](pat-entry-points.md) - Register plugins as entry points; the metadata names them without importing everything.
- [pat-module-singleton](pat-module-singleton.md) - Let a module hold the single instance; a Singleton class adds a pattern Python does not need.
- [pat-namespace-plugins](pat-namespace-plugins.md) - Put plugins under a namespace package and discover them with pkgutil.iter_modules.
- [pat-partial](pat-partial.md) - Bind arguments with functools.partial; a lambda wrapper repeats the signature by hand.
- [pat-strategy-callable](pat-strategy-callable.md) - Pass behavior as a callable; a subclass that changes one method adds ceremony.
- [pat-total-ordering](pat-total-ordering.md) - Derive the missing comparisons with total_ordering; hand-writing six methods invites mistakes.
- [pat-wraps-decorator](pat-wraps-decorator.md) - Wrap with functools.wraps; without it the decorated function loses its name and docstring.

## perf - Performance and profiling (17)

- [perf-bisect-search](perf-bisect-search.md) - Locate values in a sorted list with bisect; a linear scan rechecks every element.
- [perf-cache-methods](perf-cache-methods.md) - Do not cache instance methods with lru_cache; the cache pins every self forever.
- [perf-cache-pure](perf-cache-pure.md) - Cache pure functions with functools.cache or a bounded lru_cache.
- [perf-cached-property](perf-cached-property.md) - Cache derived attributes with cached_property; a plain property recomputes on every read.
- [perf-comprehension-build](perf-comprehension-build.md) - Build transformed lists with comprehensions, not append loops.
- [perf-cprofile-hotspots](perf-cprofile-hotspots.md) - Profile with cProfile and read cumulative time before optimizing.
- [perf-defaultdict-count](perf-defaultdict-count.md) - Count with defaultdict or Counter, not get/setdefault loops.
- [perf-deque-endpoints](perf-deque-endpoints.md) - Use deque for O(1) operations at both ends; list.pop(0) is O(n).
- [perf-generator-stream](perf-generator-stream.md) - Stream with generator expressions instead of materializing intermediate lists.
- [perf-join-strings](perf-join-strings.md) - Build strings with str.join; repeated += relies on an optimization that is not guaranteed.
- [perf-operator-getters](perf-operator-getters.md) - Extract fields with itemgetter and attrgetter; they are the module's fast field extractors.
- [perf-partial-sort](perf-partial-sort.md) - Use heapq.nsmallest or nlargest for a top-n selection instead of a full sort.
- [perf-profile-first](perf-profile-first.md) - Measure before optimizing; the hot path is rarely where it looks.
- [perf-set-dedup](perf-set-dedup.md) - Deduplicate with set or dict.fromkeys; the membership-check loop is quadratic.
- [perf-set-membership](perf-set-membership.md) - Use a set or dict for membership tests, not a list scan.
- [perf-sort-key](perf-sort-key.md) - Sort with a key function so it is called once per element.
- [perf-timeit-benchmark](perf-timeit-benchmark.md) - Benchmark small changes with timeit and compare the best of repeated runs.

## pkg - Packaging, dependencies, environments (15)

- [pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - Reserve exact pins for applications; published dependency metadata should admit compatible upgrades.
- [pkg-build-isolation](pkg-build-isolation.md) - Build source distributions in isolation; --no-build-isolation makes the build depend on ambient packages.
- [pkg-constraints-file](pkg-constraints-file.md) - Cap versions in a constraints file; it limits what installs may choose without adding dependencies.
- [pkg-distribution-import-names](pkg-distribution-import-names.md) - Depend on distribution names, not import names; the two are not guaranteed to match.
- [pkg-dry-run-report](pkg-dry-run-report.md) - Preview resolution with --dry-run --report; review what would change before touching the environment.
- [pkg-editable-install](pkg-editable-install.md) - Install the project editable for development; a regular install copies code and hides later edits.
- [pkg-env-markers](pkg-env-markers.md) - Put platform conditions in the dependency string as markers; the installer evaluates them per environment.
- [pkg-index-config](pkg-index-config.md) - Use a single index URL; --extra-index-url lets a public package shadow your private one.
- [pkg-lower-bounds](pkg-lower-bounds.md) - Set the floor you tested; add an upper bound only when a release is known to break you.
- [pkg-no-direct-urls](pkg-no-direct-urls.md) - Published dependencies should name versions; direct URL references belong to integrators, not indexes.
- [pkg-only-binary](pkg-only-binary.md) - Prefer wheels in deployments; source installs execute build code and need a compiler.
- [pkg-package-data](pkg-package-data.md) - Keep runtime data inside the package and read it with importlib.resources.
- [pkg-pip-check](pkg-pip-check.md) - Verify the environment with pip check; the resolver cannot undo earlier installs.
- [pkg-requirements-hashes](pkg-requirements-hashes.md) - Use --require-hashes with pinned requirements; hashes protect the install from remote tampering.
- [pkg-version-specifiers](pkg-version-specifiers.md) - Bound patch-level upgrades with the compatible release operator; ~=0.27.0 admits 0.27.x but not 0.28.0.

## proj - Project layout and tooling (12)

- [proj-build-artifacts](proj-build-artifacts.md) - Build distributions with python -m build; setup.py commands skip the standard flow.
- [proj-build-system-pinned](proj-build-system-pinned.md) - Declare the build backend with a constrained version in [build-system].
- [proj-console-scripts](proj-console-scripts.md) - Declare commands in [project.scripts]; installers create the launcher.
- [proj-dependency-groups](proj-dependency-groups.md) - Put lint and test tools in dependency groups, not runtime dependencies.
- [proj-optional-extras](proj-optional-extras.md) - Expose optional features as extras, not unconditional dependencies.
- [proj-pyproject-metadata](proj-pyproject-metadata.md) - Declare project metadata in the pyproject [project] table, not setup.py.
- [proj-python-m-invocation](proj-python-m-invocation.md) - Invoke pip and tools as python -m to use the active interpreter.
- [proj-readme-license](proj-readme-license.md) - Point metadata at the README and declare the license with an SPDX expression.
- [proj-requires-python](proj-requires-python.md) - Declare requires-python so installers enforce the interpreter range.
- [proj-src-layout](proj-src-layout.md) - Put importable code under src/ so the installed package is what runs.
- [proj-venv-per-project](proj-venv-per-project.md) - Install dependencies into a per-project virtual environment.
- [proj-version-metadata](proj-version-metadata.md) - Single-source the version and read it through importlib.metadata.

## sec - Security (15)

- [sec-archive-extract-filter](sec-archive-extract-filter.md) - Extract archives with filter="data"; without it a crafted member writes outside the target.
- [sec-assert-not-enforcement](sec-assert-not-enforcement.md) - Enforce access checks in real code; assert disappears under -O.
- [sec-bound-input-size](sec-bound-input-size.md) - Bound untrusted input before parsing; a small payload can still consume unbounded CPU and memory.
- [sec-compare-digest](sec-compare-digest.md) - Compare secrets in constant time with hmac.compare_digest, never with equality.
- [sec-eval-literal](sec-eval-literal.md) - Parse literal data with ast.literal_eval; eval executes arbitrary code.
- [sec-hash-integrity](sec-hash-integrity.md) - Use SHA-256 or stronger for integrity; MD5 and SHA-1 are broken for collisions.
- [sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - Load credentials from the environment; hardcoded secrets leak with the repository.
- [sec-password-hash](sec-password-hash.md) - Hash passwords with a slow key derivation function, not a bare digest.
- [sec-path-containment](sec-path-containment.md) - Resolve user paths and verify containment under the intended root.
- [sec-pickle-untrusted](sec-pickle-untrusted.md) - Never unpickle untrusted data; pickle executes code during loading.
- [sec-secrets-not-random](sec-secrets-not-random.md) - Generate security tokens with secrets; random is not cryptographically secure.
- [sec-sql-parameters](sec-sql-parameters.md) - Bind SQL values as parameters; interpolated SQL is injectable.
- [sec-ssl-verify](sec-ssl-verify.md) - Build TLS with ssl.create_default_context; never disable certificate verification.
- [sec-subprocess-no-shell](sec-subprocess-no-shell.md) - Pass argument lists to subprocess; shell=True re-parses input through a shell.
- [sec-tempfile-secure](sec-tempfile-secure.md) - Create temporary files with tempfile; predictable names invite races and symlink attacks.

## style - Style and readability (13)

- [style-blank-lines](style-blank-lines.md) - Two blank lines around top-level definitions, one between methods.
- [style-compound-statements](style-compound-statements.md) - Avoid compound statements; a body on the header line hides the control flow.
- [style-dunder-placement](style-dunder-placement.md) - Put __all__ and friends after the docstring and before imports, except future imports.
- [style-exception-suffix](style-exception-suffix.md) - Give error exceptions the Error suffix; the name tells readers the class is raised.
- [style-import-single-line](style-import-single-line.md) - One import per line; comma-joined imports are harder to read and to diff.
- [style-imports-top](style-imports-top.md) - Put imports at the top in three groups; a local import hides a dependency inside a function.
- [style-leading-underscore](style-leading-underscore.md) - Use one leading underscore for non-public attributes; public names carry none.
- [style-max-line-length](style-max-line-length.md) - Wrap lines at the agreed limit; long lines force horizontal scrolling in every review.
- [style-naming-conventions](style-naming-conventions.md) - Follow PEP 8 naming: CapWords classes, snake_case functions and variables.
- [style-property-not-getter](style-property-not-getter.md) - Use plain attributes and properties, not get_ and set_ methods, for simple data.
- [style-return-consistency](style-return-consistency.md) - Return an expression everywhere or nowhere; write bare returns as return None.
- [style-string-quotes](style-string-quotes.md) - Choose a quote style and keep it; switch only to avoid backslashes in the string.
- [style-whitespace-operators](style-whitespace-operators.md) - Spaces around binary operators; no spaces around the equals of a keyword default.

## test - Testing (17)

- [test-addcleanup](test-addcleanup.md) - Register cleanup with addCleanup; tearDown does not run when setUp fails.
- [test-assert-raises-specific](test-assert-raises-specific.md) - Assert the exact exception type; a blind Exception assertion passes for the wrong failure.
- [test-async-isolated](test-async-isolated.md) - Test coroutines with IsolatedAsyncioTestCase; it runs each async test in a new event loop.
- [test-discovery-layout](test-discovery-layout.md) - Keep test modules importable and free of import-time side effects.
- [test-doctest-runnable](test-doctest-runnable.md) - Keep docstring examples runnable so doctest executes them as tests.
- [test-exception-attributes](test-exception-attributes.md) - Assert the caught exception's attributes, not only its type.
- [test-float-close](test-float-close.md) - Compare floats with a tolerance, never exact equality.
- [test-isolation](test-isolation.md) - Keep each test self-contained and independent of execution order.
- [test-log-contract](test-log-contract.md) - Assert log contracts with assertLogs instead of capturing stderr.
- [test-mock-assertions](test-mock-assertions.md) - Assert mock calls with assert_called_once_with; hand-read call_args misses the diagnostics.
- [test-mock-autospec](test-mock-autospec.md) - Build mocks with autospec so they enforce the real signature.
- [test-mock-where-looked-up](test-mock-where-looked-up.md) - Patch a name where it is looked up, not where it is defined.
- [test-one-behavior](test-one-behavior.md) - Test one behavior per method and name the method for that behavior.
- [test-skip-reason](test-skip-reason.md) - Skip with skipIf or skipUnless and a reason; silently returning hides the gap.
- [test-subtests-loop](test-subtests-loop.md) - Run parameterized cases as subtests so every case is reported.
- [test-temp-dir](test-temp-dir.md) - Put filesystem fixtures under TemporaryDirectory so cleanup is automatic.
- [test-warn-contract](test-warn-contract.md) - Assert warning contracts with assertWarns instead of reading stderr.

## type - Type system and annotations (28)

- [type-alias-statement](type-alias-statement.md) - Declare aliases with the type statement so they are scoped, lazy, and introspectable.
- [type-annotate-signatures](type-annotate-signatures.md) - Annotate every public parameter and return value; unannotated signatures default to Any.
- [type-annotated-metadata](type-annotated-metadata.md) - Attach context to annotations with Annotated; tools read the metadata and checkers still see the type.
- [type-avoid-any](type-avoid-any.md) - Keep Any out of new signatures; use object or a precise union when the type is unknown.
- [type-builtin-generics](type-builtin-generics.md) - Use list[int] and collections.abc types in annotations instead of typing aliases.
- [type-final-classvar](type-final-classvar.md) - Mark constants Final and class-level attributes ClassVar so rebinding is checked.
- [type-final-methods](type-final-methods.md) - Mark non-overridable methods and classes with typing.final so checker flags forbidden overrides.
- [type-forward-refs-unquoted](type-forward-refs-unquoted.md) - Write forward references unquoted; deferred annotations no longer require string literals.
- [type-generic-syntax](type-generic-syntax.md) - Declare generic functions and classes with the bracketed type parameter syntax.
- [type-ignore-coded](type-ignore-coded.md) - Give every type ignore an error code so only the intended diagnostic is suppressed.
- [type-literal-sets](type-literal-sets.md) - Use Literal for finite value sets; bare str accepts every string.
- [type-literalstring](type-literalstring.md) - Type sensitive string parameters as LiteralString; runtime strings then fail type checking.
- [type-narrow-dont-cast](type-narrow-dont-cast.md) - Narrow values with isinstance, TypeIs, or match; cast only after a proven invariant.
- [type-never-noreturn](type-never-noreturn.md) - Type functions that never return as Never; None says the function falls off the end.
- [type-newtype-ids](type-newtype-ids.md) - Brand distinct identifiers with NewType so IDs cannot be swapped silently.
- [type-overload-signatures](type-overload-signatures.md) - Describe argument-dependent return types with overload instead of one union signature.
- [type-override-decorator](type-override-decorator.md) - Mark overriding methods with @override so a renamed or typo'd method fails the check.
- [type-param-spec](type-param-spec.md) - Preserve wrapped signatures with ParamSpec; Callable[..., T] erases every parameter.
- [type-protocol-interface](type-protocol-interface.md) - Define structural interfaces with Protocol; annotate parameters with the capability they use.
- [type-readonly-typeddict](type-readonly-typeddict.md) - Mark immutable TypedDict items as ReadOnly so checkers reject assignments to them.
- [type-runtime-checkable](type-runtime-checkable.md) - Mark runtime-checked protocols with @runtime_checkable; plain protocols raise on isinstance.
- [type-self-return](type-self-return.md) - Annotate fluent and alternative-constructor returns with Self, not the class name.
- [type-typeddict-boundary](type-typeddict-boundary.md) - Model fixed-schema payloads as TypedDict; dict[str, Any] checks nothing.
- [type-typeddict-notrequired](type-typeddict-notrequired.md) - Mark optional TypedDict keys with NotRequired; total=False makes every key optional at once.
- [type-typeis-narrow](type-typeis-narrow.md) - Type predicate functions with TypeIs so both branches narrow.
- [type-typevar-bound](type-typevar-bound.md) - Bound type variables to the interface the body uses; an unbound T permits no attribute access.
- [type-union-pipe](type-union-pipe.md) - Write unions as X | Y and optional values as X | None.
- [type-unpack-kwargs](type-unpack-kwargs.md) - Type **kwargs with Unpack over a TypedDict; object erases every keyword the function accepts.
