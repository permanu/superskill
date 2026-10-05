# Verification Report — C++ Batch 5 (mem + obs)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 24 draft rules — 12 `catalog/rules/cpp/mem-*.md`, 12 `catalog/rules/cpp/obs-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23`
**Scratch:** `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/cpp-batch5-verify`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied the five checks per rule.
2. Fetched all 25 unique cited URLs (all HTTP 200) and grepped each for the specific claim; where the cited page was not the full story, also fetched the linked subpage (`operator new`, `source_location::current`, `basic_osyncstream`, `steady_clock`, `polymorphic_allocator`, `cout`).
3. Extracted all 48 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran behavior probes under timeouts: alignment counts + UBSan misalignment, `bad_alloc`/nothrow, null delete under ASan, ASan alloc-dealloc mismatch, monotonic arena accounting, cross-TU incomplete delete, malloc-vs-new failure, `make_unique_for_overwrite` marker test, ASan use-after-return, 80,000-line interleaving counters, clog/cerr file ordering, `error_code::message`, `what()`, `std::format` (plus negative compile), nested-cause chain, double-log counter, source_location line check, system vs steady epochs, terminate handler (SIGABRT), `thread::id` output.
5. Structural/duplicate pass over the 24 files and the full cpp pack (frontmatter, section order, one fence per Bad/Good, summary length, hedging, `related`/See Also resolution, Jaccard) plus the deterministic validator (`node dist/rules/cli.js validate --lang cpp --json`).

## Source verification (evidence quotes)

- **cppreference `new`** — over-aligned: "If the alignment requirement exceeds `__STDCPP_DEFAULT_NEW_ALIGNMENT__` ... the new expression passes the alignment requirement (wrapped in `std::align_val_t`) as the second argument for the allocation function"; non-throwing failure: "returns a null pointer ... the new expression returns immediately". (`mem-aligned-new`, `mem-let-new-throw`)
- **cppreference `delete`** — "If ptr is a null pointer value, no destructors are called ... the default deallocation functions are guaranteed to do nothing when passed a null pointer."; "If the object being deleted has incomplete class type ... behavior is undefined (until C++26) the program is ill-formed (since C++26)."; mismatched pointer: "If ptr is anything else ... the behavior is undefined." (`mem-delete-null-ok`, `mem-no-delete-incomplete`, `mem-matched-alloc-free`)
- **cppreference `pimpl`** — "Because `std::unique_ptr` requires that the pointed-to type is a complete type in any context where the deleter is instantiated, the special member functions must be user-declared and defined out-of-line". (`mem-no-delete-incomplete`)
- **cppreference `monotonic_buffer_resource`** — "memory is released only when the resource is destroyed. It is intended for very fast memory allocations in situations where memory is used to build up a few objects and then is released all at once"; `do_deallocate` is "no-op"; "monotonic_buffer_resource is not thread-safe". (`mem-monotonic-resource`, `mem-resource-outlives`)
- **cppreference `memory_resource`** — "abstract interface to an unbounded set of classes encapsulating memory resources". The container-stores-only-a-pointer lifetime sentence is on neither cited page; corroborated by the monotonic release semantics and ASan (minor note, `mem-resource-outlives`).
- **C++ Core Guidelines** — R.5 "Prefer scoped objects, don't heap-allocate unnecessarily"; R.10 "Avoid malloc() and free() ... do not support construction and destruction, and do not mix well with new and delete"; R.2 "Arrays are best represented by a container type (e.g., vector (owning)) or a span (non-owning) ... hold sufficient information to do range checking"; SL.con.1 "Prefer using STL array or vector instead of a C array ... does know its size". (`mem-scoped-over-heap`, `mem-no-malloc`, `mem-no-smartptr-subscript`)
- **cppreference `vector`** — "The elements are stored contiguously"; `reserve()` "can be used to eliminate reallocations". (`mem-buffer-vector-byte`, `mem-overwrite-buffers`)
- **cppreference `unique_ptr`** — `operator[]` listed only under "Array version, `unique_ptr<T[]>`"; the page does not literally state "no size" (minor note). (`mem-buffer-vector-byte`, `mem-no-smartptr-subscript`)
- **cppreference `make_unique`** — `make_unique<T[]>(n)`: "array elements are value-initialized"; `make_unique_for_overwrite` array overload: "the array is default-initialized". (`mem-overwrite-buffers`)
- **cppreference `clog`** — "associated with stderr, but, unlike std::cerr/std::wcerr, these streams are not automatically flushed and cout is not automatically tie()'d"; "safe to concurrently access these objects ... for both formatted and unformatted output". The interleaving detail is not on this page (behavior-confirmed; the `basic_osyncstream` page documents the guarantee). (`obs-clog-vs-cerr`, `obs-atomic-lines`, `obs-thread-id`)
- **cppreference `cerr`** — "(`std::cerr.flags() & unitbuf) != 0 ... any output sent to these stream objects is immediately flushed to the OS". (`obs-clog-vs-cerr`)
- **cppreference `lock_guard`** — "RAII-style mechanism for owning a mutex for the duration of a scoped block". (`obs-atomic-lines`)
- **cppreference `error_code`** — "message obtains the explanatory string for this error_code". (`obs-error-code-message`)
- **cppreference `exception` / `what`** — "what [virtual] returns an explanatory string"; "Returns the explanatory string." (`obs-exception-what`)
- **cppreference `format`** — "Since P2216R3, std::format does a compile-time check on the format string ... a compilation error will be emitted". (`obs-format`)
- **cppreference `throw_with_nested`** — contains the same recursive `rethrow_if_nested` printer as the Good snippet. (`obs-nested-cause`)
- **CWE-532** — "CVE-2017-9615 verbose logging stores admin credentials in a world-readable log file; CVE-2018-1999036 SSH password for private key stored in build log". (`obs-no-secrets`)
- **isocpp FAQ** — "Use catch only to specify error handling actions when you know you can handle an error"; **libstdc++ manual** — "Exception Neutrality ... propagating exceptions should not be swallowed in gratuitous catch(...) blocks". (`obs-report-once`)
- **cppreference `source_location::current`** — "If current() is used in a default argument, the return value corresponds to the location of the call to current() at the call site"; the main page's example is the same default-argument log helper. (`obs-source-location`)
- **cppreference `system_clock`** — "represents the system-wide real time wall clock ... the only C++ clock that has the ability to map its time points to C-style time"; `steady_clock` — "not related to wall clock time". (`obs-system-clock`)
- **cppreference `set_terminate`** — "f shall terminate execution of the program without returning"; example uses `current_exception`/`rethrow_exception`/`abort`. (`obs-terminate-handler`)
- **cppreference `thread::id`** — "lightweight, trivially copyable class that serves as a unique identifier"; "operator<< serializes a thread::id object". (`obs-thread-id`)

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 48/48 snippets: exit 0.
- Intended diagnostics: `mem-matched-alloc-free` Bad → `-Wmismatched-new-delete` (line 7, "delete applied to a pointer that was allocated with 'new[]'"); `mem-no-delete-incomplete` Bad → `-Wdelete-incomplete` (line 4, "incompatible with C++2c and may cause undefined behavior"). All Good snippets clean.

## Behavior results (timeouts applied)

- **aligned-new:** malloc 32-byte-aligned 13/64 vs new 64/64; UBSan: "member access within misaligned address ... requires 32 byte alignment" on the malloc path.
- **let-new-throw:** plain `new` threw `bad_alloc`; `nothrow` returned null (1<<50 elements); 1<<40 overcommits on macOS and is not a failure.
- **delete-null-ok:** `delete nullptr` / `delete[] nullptr` no-ops; clean under ASan.
- **matched-alloc-free:** Bad aborts under ASan `alloc_dealloc_mismatch=1` — "alloc-dealloc-mismatch (operator new vs free)"; Good clean (option is off by default on Darwin).
- **monotonic-resource:** local resource: 4 upstream allocations while containers live, all 4 freed when the resource dies; static-snippet pattern called 100× → 10 upstream allocations, 0 frees (arena never released per batch).
- **no-delete-incomplete:** Bad (incomplete) dtor count 0; Good (complete) dtor count 1; warning as above.
- **no-malloc:** `malloc(1<<50)` returns null; plain `new` throws `bad_alloc`.
- **overwrite-buffers:** with a marker-writing `operator new[]`, value-init zeroed 16/16 bytes, `make_unique_for_overwrite` kept the marker 16/16 (no write pass).
- **resource-outlives:** Bad under ASan → "stack-use-after-return" in `memory_resource::deallocate`; Good clean.
- **atomic-lines:** 80,000 lines each; Bad 35 malformed lines, Good 0.
- **clog-vs-cerr:** file order follows program order on macOS because stderr's C `FILE` is unbuffered; the documented difference (cerr unitbuf flush guarantee) holds (minor note).
- **error-code-message:** `value=13 message='Permission denied'`; **exception-what:** Good logs "connection refused"; **format:** Good prints "request 42 -> 200", bad format string fails compilation with a consteval error; **nested-cause:** chain prints "saving config failed" then "disk offline"; **report-once:** Bad logs 2 lines for one failure, Good 1; **source-location:** reported line == call-site line (10); **system-clock:** system epoch == wall time (delta 0 s), steady epoch 1,950,417 s (boot-relative); **terminate-handler:** SIGABRT with "terminating: worker failed"; **thread-id:** "[thread 0x1fadf2180] started".

## Deterministic validator (blocking)

`node dist/rules/cli.js validate --lang cpp --json` → 5 errors touching these files (confirmed by direct `js-yaml` parse):

- `fm-parse`: `mem-matched-alloc-free` (`symbols: [new[], delete[], std::free]`), `mem-no-smartptr-subscript` (`symbols: [std::unique_ptr, operator[]]`), `obs-no-secrets` (unquoted title containing `:` — `CWE-532: Insertion...`).
- `field-type`: `mem-delete-null-ok`, `mem-let-new-throw` — bare `null` in `triggers.keywords` parses as YAML null (`["delete",null,"check","cleanup"]`).

Non-blocking warnings (§12): `comment-elision` inside comments in `mem-resource-outlives` (2) and `obs-report-once` (3).

## Idiom rejection

`mem-monotonic-resource` Good uses a function-local **static** `monotonic_buffer_resource` (static buffer too). Measured: 100 calls × 1000 labels → 10 upstream allocations, 0 frees — the arena is never released between batches, so "frees everything at once" holds only at program exit; the static mutable arena is also not thread-safe, which the rule's own Why warns about, and the Why says "initial buffer on the stack" while the snippet uses static storage. Fix: take a caller-owned `std::pmr::memory_resource*` parameter (releasable per batch) or scope the resource locally. The rest of the rule (Why, Bad, sources) is sound.

## Duplicates / consistency / links

- No pair with summary Jaccard ≥ 0.5 within the batch or against the rest of `catalog/rules/cpp/`; cross-prefix related rules spot-checked (`raii-no-naked-new`, `raii-wrap-resources`, `raii-unique-default`, `raii-raw-non-owning`, `raii-lock-guard`, `err-no-catch-all-swallow`, `err-translate-with-context`, `perf-no-endl`, `api-pimpl`, `type-span`) — distinct decisions.
- All `related` ids and See Also links resolve; section order, single `cpp` fence per Bad/Good, summary ≤ 30 words, no TODO/elisions/hedges — clean for all 24.
- Replaced-topic check: no `osyncstream`, `stacktrace`, `basic_syncbuf`, or `basic_stacktrace` reference anywhere in the repo (only an unrelated Java `obs-log-throwable` keyword); no dangling references remain.
- `INDEX.md` lists exactly these 24 files; its verified count (63) and batch-status line are stale after these flips — owner to update (outside verifier scope).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-mem-aligned-new | verified | new page aligned-overload quote; malloc 13/64 vs new 64/64; UBSan misalignment caught; both rc=0 |
| cpp-mem-buffer-vector-byte | verified | vector contiguous/size/data + unique_ptr array `operator[]`; both rc=0 |
| cpp-mem-delete-null-ok | **rejected** | validator `field-type`: bare `null` keyword parses as YAML null (content otherwise correct: delete-page no-op quote, ASan-clean behavior) |
| cpp-mem-let-new-throw | **rejected** | validator `field-type`: bare `null` keyword; content correct (plain new threw `bad_alloc`, nothrow null); bad_alloc/new-handler wording lives on the linked `operator new` page |
| cpp-mem-matched-alloc-free | **rejected** | validator `fm-parse`: `symbols: [new[], delete[], std::free]` is invalid YAML (content correct: ASan alloc-dealloc-mismatch on Bad, delete-page UB quote) |
| cpp-mem-monotonic-resource | **rejected** | idiom: static function-local arena grows across calls (100 calls → 10 upstream allocs, 0 frees) and is thread-unsafe; contradicts "frees everything at once" and Why's stack-buffer sentence |
| cpp-mem-no-delete-incomplete | verified | delete-page "undefined (until C++26) / ill-formed (since C++26)" quote; pimpl quote; `-Wdelete-incomplete`; dtor count 0 vs 1; both rc=0 |
| cpp-mem-no-malloc | verified | CG R.10 quote; malloc null vs new `bad_alloc`; both rc=0 |
| cpp-mem-no-smartptr-subscript | **rejected** | validator `fm-parse`: `symbols: [std::unique_ptr, operator[]]` invalid YAML (CG R.2/SL.con.1 back prefer-container only indirectly) |
| cpp-mem-overwrite-buffers | verified | make_unique page value-init vs default-init quotes; marker test 16/16 zeroed vs 16/16 preserved; both rc=0 |
| cpp-mem-resource-outlives | verified | monotonic release-at-destruction + no-op deallocate; ASan stack-use-after-return on Bad; both rc=0 |
| cpp-mem-scoped-over-heap | verified | CG R.5 exact; both rc=0 |
| cpp-obs-atomic-lines | verified | clog concurrency-safe quote + lock_guard RAII; 35/80,000 malformed vs 0/80,000; both rc=0 |
| cpp-obs-clog-vs-cerr | verified | clog "not automatically flushed" vs cerr unitbuf "immediately flushed" quotes; both rc=0 (POSIX stderr unbuffered — minor note) |
| cpp-obs-error-code-message | verified | error_code "message obtains the explanatory string"; `value=13 message='Permission denied'`; both rc=0 |
| cpp-obs-exception-what | verified | exception/what "explanatory string" quotes; Good logs "connection refused"; both rc=0 |
| cpp-obs-format | verified | format compile-time-check quote; bad format fails compile (consteval error); Good prints "request 42 -> 200"; both rc=0 |
| cpp-obs-nested-cause | verified | throw_with_nested page's own recursive printer example; two-level chain prints both causes; both rc=0 |
| cpp-obs-no-secrets | **rejected** | validator `fm-parse`: unquoted source title with colon; content otherwise correct (CWE-532 CVE quotes) |
| cpp-obs-report-once | verified | isocpp FAQ handle-only quote + libstdc++ neutrality quote; 2 vs 1 log lines; both rc=0 |
| cpp-obs-source-location | verified | current() default-argument call-site quote; reported line == call line; both rc=0 |
| cpp-obs-system-clock | verified | system_clock wall-clock/time_t + steady_clock "not related to wall clock" quotes; delta 0 s vs boot-relative 1,950,417 s; both rc=0 |
| cpp-obs-terminate-handler | verified | set_terminate "without returning" + current_exception/abort example; SIGABRT with "terminating: worker failed"; both rc=0 |
| cpp-obs-thread-id | verified | thread::id lightweight/copyable + operator<< quotes; output "[thread 0x...] started"; both rc=0 |

**Counts: verified 18/24, rejected 6.** Statuses flipped for the 18 verified rules only.

**Fixes needed before the 6 rejected rules can pass:**
1. `mem-matched-alloc-free`, `mem-no-smartptr-subscript`, `obs-no-secrets` — quote the offending YAML scalars (`symbols: ["new[]", "delete[]", "std::free"]`, `symbols: ["operator[]"]`, quote the CWE title).
2. `mem-delete-null-ok`, `mem-let-new-throw` — quote `"null"` in `triggers.keywords`.
3. `mem-monotonic-resource` — replace the static resource with a caller-passed or scope-local resource so batches are actually released together.

---

## Addendum — re-check of the six fixed rules (2026-10-05)

The six rejected rules were fixed and re-verified with the same checks; all six now pass and were flipped to `verified`.

**Fixes confirmed:**

- **YAML:** all five frontmatters now parse with `js-yaml`; the flow sequences contain proper strings (`"null"` keywords; `["new[]", "delete[]", std::free]`; `[std::unique_ptr, "operator[]"]`), and the CWE-532 title is quoted.
- **Deterministic validator:** `node dist/rules/cli.js validate --lang cpp --json` → **0 errors touching any of the 24 files** (the only remaining warnings are the pre-existing non-blocking `comment-elision` warnings in `mem-resource-outlives` and `obs-report-once`).
- **Compile:** all 48 snippets re-extracted and recompiled with `clang++ -fsyntax-only -std=c++23 -Wall` → 48/48 rc=0; only the two intended diagnostics remain (`-Wmismatched-new-delete`, `-Wdelete-incomplete`).
- **`mem-monotonic-resource` rewrite:** the Good now takes a caller-owned `std::pmr::monotonic_buffer_resource&` and uses a stack `std::array<std::byte, 4096>` buffer with a scope-local resource declared before the labels. Behavior: 3 consecutive small batches → **0 upstream allocations** (stack buffer serves everything; no cross-batch accumulation); an oversized batch (200 labels in a 256-byte buffer) → 6 upstream allocations while alive, all 6 freed when the resource is destroyed; the extracted snippet runs with rc=0. The Why's "initial buffer on the stack" and "released all at once" claims now hold, and the snippet demonstrates the linked `cpp-mem-resource-outlives` contract instead of contradicting it.

**Verdicts (re-check):**

| rule id | verdict | evidence |
|---|---|---|
| cpp-mem-delete-null-ok | verified | `"null"` quoted; validator 0 errors; delete-page null no-op quote; ASan-clean behavior; both rc=0 |
| cpp-mem-let-new-throw | verified | `"null"` quoted; validator 0 errors; plain new threw `bad_alloc`, nothrow returned null; both rc=0 |
| cpp-mem-matched-alloc-free | verified | `"new[]"`/`"delete[]"` quoted; validator 0 errors; ASan alloc-dealloc-mismatch on Bad; both rc=0 |
| cpp-mem-no-smartptr-subscript | verified | `"operator[]"` quoted; validator 0 errors; CG R.2/SL.con.1 size/container backing; both rc=0 |
| cpp-mem-monotonic-resource | verified | caller-owned arena rewrite; 3 batches 0 upstream allocs, oversized batch 6 allocs/6 frees; snippet rc=0; both rc=0 |
| cpp-obs-no-secrets | verified | CWE-532 title quoted; validator 0 errors; CWE-532 CVE quotes; both rc=0 |

**Final counts: verified 24/24, rejected 0.** All 24 batch-5 rules are now `status: verified`.

Note: `INDEX.md`'s verified count and batch-status line remain stale after these flips — owner follow-up, outside verifier scope.
