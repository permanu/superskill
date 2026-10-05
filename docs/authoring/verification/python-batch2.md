# Verification Report - Python Batch 2 (`type` + `async`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-04
- Scope: `catalog/rules/python/type-*.md` (15) and `async-*.md` (16) = 31 rules; all entered as `status: draft`
- Toolchain: CPython 3.14.6 (`/opt/homebrew/bin/python3`), macOS; pyright present (not needed: static claims source-backed)
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/verify-python-batch2`

## Method

- Fetched every cited URL (typing docs/spec, PEP 695/604, What's New 3.14, asyncio runner/sync/queue/task, contextvars, concurrent.futures, Google pyguide, Ruff UP006/UP007/ASYNC251) and captured supporting quotes.
- Extracted both snippets from each rule (62 files) and ran `python3 -m py_compile` over all of them (clean; no warnings).
- Ran 64 behavioral probes in the scratch dir: no network, no filesystem writes, no long sleeps; process-pool and blocking probes isolated behind a `__main__` guard / short sleeps. Covered every behavior the batch brief listed: TaskGroup cancellation, gather `return_exceptions`, shield, queue backpressure, contextvars, offload, task retention, `asyncio.Runner`, plus the other runtime claims.
- Cross-checked frontmatter, ids, `related` and See Also resolution, INDEX file list, trigger counts, `enforce`/`tool` consistency, body order, snippet/summary limits, and duplicate/near-duplicate review within the pack and against batch 1.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| python-type-alias-statement | verified | PEP 695 "Type aliases can refer to themselves without the use of quotes" + `TypeAliasType`/lazy value; typing docs "Deprecated since version 3.12: TypeAlias is deprecated in favor of the type statement". Run: Good alias is `TypeAliasType`, definition succeeds with an undefined name and `__value__` access raises `NameError`; Bad alias is a `GenericAlias`. |
| python-type-annotate-signatures | rejected | Why's load-bearing claim ("unannotated parameters/returns default to Any") is absent from both cited sources: cached `typing.html` has 0 matches for "unannotated"/"default annotation"; pyguide's only "assumed to be Any" is about generic type parameters (§3.19.15). The claim is stated in the uncited typing spec annotations page. Fix: cite `https://typing.python.org/en/latest/spec/annotations.html` ("For a checked function, the default annotation for arguments and for the return type is Any."). Compile, idiom, and formatting otherwise pass. |
| python-type-avoid-any | verified | typing docs "Every type is assignable to Any. Any is assignable to every type" + "Use object to indicate that a value could be any type in a typesafe manner"; spec concepts same. Run: Bad hints erase to `list[Any] -> Any`; Good keeps the type parameter and returns the caller's type. |
| python-type-builtin-generics | verified | typing "Deprecated aliases ... PEP 585"; Ruff UP006 exists ("generics that can be replaced with standard library variants based on PEP 585"). Run: Good annotates `collections.abc.Iterable[int]`/`dict[str, int]`; Bad keeps `typing.List`/`typing.Dict`. |
| python-type-final-classvar | verified | typing Final "cannot be reassigned in any scope ... cannot be overridden in subclasses"; ClassVar "should not be set on instances of that class". Run: `ClassVar[int]` preserved; rebinding `Final` works at runtime (checker-only, as documented); instance state stays separate. |
| python-type-forward-refs-unquoted | verified | What's New 3.14 "It is no longer necessary to enclose annotations in strings if they contain forward references" + `annotationlib`. Run on 3.14.6: unquoted `Tree \| None` inside the class body resolves via `get_type_hints` (quoted spelling also still resolves). |
| python-type-generic-syntax | verified | PEP 695 "eliminates the need for variance to be specified ... infer the variance" + scoped parameters; typing docs document the bracketed syntax. Run: Good exposes `__type_params__`; Bad leaks a module-level `TypeVar`. |
| python-type-ignore-coded | verified | typing spec directives: "The form # type: ignore[...] may be used to suppress only type errors with a given error code" and "A bare # type: ignore must always suppress all type errors". Comment-only change: compile-only; no runtime behavior to run. Note: second citation (`typing.html` TYPE_CHECKING) is loose, but the primary spec carries the claim. |
| python-type-literal-sets | verified | typing Literal example (mode constrained, typo flagged) + "at runtime, an arbitrary value is allowed". Run: `LogMode.__value__ == Literal['r','w']`; values stay plain `str`; Bad keeps the runtime guard the checker replaces. |
| python-type-narrow-dont-cast | verified | typing `cast` "returns the value unchanged ... at runtime we intentionally don't check anything"; spec narrowing + `TypeIs`. Run: cast is a no-op; Bad fails late with `len()`'s TypeError; Good raises its own `TypeError` via `isinstance(..., Sized)`. |
| python-type-newtype-ids | verified | typing NewType "create low-overhead distinct types ... calling a NewType returns its argument unchanged". Run: identity at runtime, `__supertype__` is `int`, Bad ID swap runs silently. |
| python-type-protocol-interface | verified | typing "structural subtyping (static duck-typing)" + `Protocol` example. Run: a duck-typed class satisfies the protocol at runtime. |
| python-type-self-return | verified | typing `Self` "Special type to represent the current enclosed class" with classmethod/`__enter__` use cases. Run: fluent method returns `self`; annotation resolves to `typing.Self`. |
| python-type-typeddict-boundary | verified | typing TypedDict "expects all of its instances to have a certain set of keys ... only enforced by type checkers"; NotRequired marks optional keys. Run: required/optional key sets correct; both access forms work. |
| python-type-union-pipe | verified | PEP 604 "int \| str == typing.Union[int, str]"; typing docs 3.14 "both Union[int, str] and int \| str create instances of the same class"; Ruff UP007 exists. Run: equality and same-class confirmed. Note: UP007 covers `Union` only — `Optional`→pipe is UP045. |
| python-async-aclosing-generators | verified | contextlib aclosing "deterministic cleanup ... exit early by break or an exception" and "executed in the same context as its iterations". Run: Bad cleanup order `['after-loop','cleanup']`; Good `['cleanup','after-loop']`. |
| python-async-await-coroutines | verified | asyncio "simply calling a coroutine will not schedule it to be executed" + docs example "will raise a RuntimeWarning". Run: Bad emits "was never awaited"; Good is clean. |
| python-async-contextvars | verified | contextvars "should be created at the top module level and never in closures"; asyncio "the Task copies the current context". Run: global leaks (`bob`,`bob`); ContextVar isolates (`alice`,`bob`). |
| python-async-gather-inspect | verified | asyncio "exceptions are treated the same as successful results, and aggregated in the result list" + "won't be cancelled". Run: Bad prints `2` and hides the failure; Good raises `ExceptionGroup` with `OSError`. Note: see follow-ups for the cancelled-child edge. |
| python-async-no-global-loop | verified | runner "loop is closed at the end ... cannot be called when another loop is running in the same thread". Run: cached loop raises `RuntimeError: Cannot run the event loop while another loop is running` inside `asyncio.run`; cached loop is not the running loop; Good resolves per call. |
| python-async-no-time-sleep | verified | Ruff ASYNC251 exists and the official rules index marks it "Enabled by default"; asyncio.sleep "always suspends the current task, allowing other tasks to run". Run: ticker ticks 2 (time.sleep) vs 11 (asyncio.sleep). |
| python-async-offload-blocking | verified | asyncio "Directly calling blocking_io() in any coroutine would block the event loop for its duration ... by using asyncio.to_thread() we can run it in a separate thread"; GIL note limits it to IO-bound work. Run: ticker ticks 2 (direct) vs 13 (to_thread). |
| python-async-offload-cpu | verified | asyncio "Due to the GIL, asyncio.to_thread() can typically only be used to make IO-bound functions non-blocking"; concurrent.futures ProcessPoolExecutor "side-step the Global Interpreter Lock ... only picklable objects"; InterpreterPoolExecutor "isolated ... its own Global Interpreter Lock". Run: literal Good returns `b'payload'`; worker pid differs from parent. |
| python-async-primitives | verified | asyncio-sync "not thread-safe ... should not be used for OS thread synchronization (use threading for that)". Run: threading lock stalls the loop (0.31 s, 2 ticks); asyncio lock waits without blocking (0.000 s, 4+ ticks). |
| python-async-queue-backpressure | verified | asyncio-queue "await put() blocks when the queue reaches maxsize until an item is removed by get()". Run: unbounded queue accepts all 5 immediately; `maxsize=2` holds the producer at 2 until the consumer drains. |
| python-async-run-entry | verified | runner "taking care of managing the asyncio event loop, finalizing asynchronous generators, and closing the executor ... ideally only be called once" + SIGINT handling. Run: `asyncio.Runner` closes its loop after `close()`; both snippets run. |
| python-async-shield-selectively | verified | asyncio "the Task running in something() is not cancelled ... its caller is still cancelled, so the 'await' expression still raises a CancelledError". Run: caller cancelled while shielded inner work completes (`'committed'`). |
| python-async-task-naming | verified | `create_task(..., name=...)` + `get_name` docs; What's New 3.14 task table lists "their names". Run: named task reports `poll_feed`; unnamed gets a generated `Task-N`. |
| python-async-task-retrieve | verified | asyncio "if a task fails, its exception is never retrieved and asyncio logs a 'Task exception was never retrieved' message when the task is garbage collected". Run: message captured for Bad, none for Good. |
| python-async-task-strong-ref | verified | asyncio "Save a reference ... The event loop only keeps weak references ... may get garbage collected at any time, even before it's done" + the exact `background_tasks.add` / `add_done_callback(discard)` pattern. Run: Good's set empties on completion. Note: mid-execution collection is timing-dependent and did not reproduce in-run. |
| python-async-taskgroup-structured | verified | asyncio "the remaining tasks in the group are cancelled ... combined in an ExceptionGroup ... raised". Run: sibling cancelled (`['b']`), failures raised as a group. |

## Cross-cutting checks

- Compile: 62/62 snippets pass `python3 -m py_compile` on CPython 3.14.6, no warnings.
- Behavior: 64/64 probes pass; the run log includes the negative controls (loop starvation, deadlock-free lock comparison, unbounded queue, silent failures).
- Formatting: all 31 follow the contract body order; one `Bad` and one `Good` python fence each; snippets ≤ 25 lines (max 20); summaries ≤ 30 words (max 17); Why 2-5 sentences; `baseline: latest`; no hedge/TODO tokens; keywords 2-8; `files: ["**/*.py"]`.
- Links/ids: all ids match paths; all `related` ids resolve (including the five cross-pack ids to verified batch-1 `err` rules); all See Also links resolve; INDEX.md lists exactly the 31 files.
- Duplicates: no duplicates or near-duplicates. `async-no-time-sleep` (lintable `time.sleep` in async functions, must/tool, ASYNC251) and `async-offload-blocking` (broader blocking I/O with no async equivalent, should/review, `to_thread`) are genuinely distinct decisions and cross-reference each other — keep both as authored.
- Tool ids (official Ruff docs): UP006 non-pep585-annotation, UP007 non-pep604-annotation-union, ASYNC251 blocking-sleep-in-async-function all exist; ASYNC251's "by default" claim is confirmed by the rules index ("Enabled by default", suspicious category).

## Follow-ups (outside verifier ownership)

- `python-type-annotate-signatures` stays `draft`: add the typing spec annotations URL (see verdict row), then re-verify.
- `python-async-gather-inspect` Good snippet: the `isinstance(result, BaseException)` filter combined with `ExceptionGroup` raises `TypeError: Cannot nest BaseExceptions in an ExceptionGroup` when a gathered child was cancelled (confirmed in-run: `['CancelledError']` in results). Suggest `BaseExceptionGroup`, or filter `Exception`. Non-blocking.
- `python-type-union-pipe`: `ruff:UP007` enforces `Union`→pipe only; `Optional`→pipe is `UP045`. Consider adding it if the tool claim should cover `X | None`.
- Version-like tokens in rule frontmatter occur only inside cited `whatsnew/3.14.html` URLs; rule bodies are version-free.
- `INDEX.md` (`verified: 16`) and `categories.md` batch status are stale after this batch's flips; owners should update counts.

## Counts

- Verified: 30/31 (14 `type`, 16 `async`)
- Rejected: 1 (`python-type-annotate-signatures`)
- Blockers: none for the verified set; one citation fix required for the rejected rule

---

# Addendum - Re-checks (2026-10-05)

Three edits were re-verified after the initial report. All three pass; the earlier follow-ups for these rules are superseded.

## 1. python-type-annotate-signatures -> verified

- Source: the typing spec annotations page is now cited first and states: "For a checked function, the default annotation for arguments and for the return type is Any." (also "Any function without annotations can be treated as having Any annotations on all arguments and the return type."). The reworded Why matches this wording.
- Compile: both snippets pass `python3 -m py_compile` (CPython 3.14.6).
- Consistency: title/summary/triggers unchanged and still match the body; formatting conforms; `related` resolves.
- Verdict: verified (flipped). The previous rejection is superseded.

## 2. python-async-gather-inspect -> verified

- Why now explains the `BaseExceptionGroup` choice; exceptions.html states: "The BaseExceptionGroup constructor returns an ExceptionGroup rather than a BaseExceptionGroup if all contained exceptions are Exception instances, so it can be used to make the selection automatic. The ExceptionGroup constructor, on the other hand, raises a TypeError if any contained exception is not an Exception subclass."
- Compile: both snippets pass.
- Behavior re-run: normal path raises `ExceptionGroup` with `['OSError']`; cancelled-child path now raises `BaseExceptionGroup` with `['CancelledError']` (previously `TypeError: Cannot nest BaseExceptions in an ExceptionGroup`); direct probe: `BaseExceptionGroup("x",[ValueError()])` -> `ExceptionGroup`, `BaseExceptionGroup("x",[KeyboardInterrupt()])` -> `BaseExceptionGroup`.
- Verdict: verified (flipped). The previous edge-case follow-up is resolved.

## 3. python-type-union-pipe -> verified (unchanged)

- Added source `Ruff UP045 - non-pep604-annotation-optional` fetched: "Check for typing.Optional annotations that can be rewritten based on PEP 604 syntax... Use instead: foo: int | None = None". It backs the `Optional` half of the rule; UP007 continues to back the `Union` half.
- No body/snippet changes; compile and the prior behavioral evidence still hold. Verdict unchanged: verified.

## Final counts

- Batch 2 (`type` + `async`): 31/31 verified, 0 rejected.
- Python pack total: 47/47 verified (16 `err` + 15 `type` + 16 `async`).

