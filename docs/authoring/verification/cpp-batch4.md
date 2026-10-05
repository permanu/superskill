# Verification Report — C++ Batch 4 (perf + test)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 24 draft rules — 12 `catalog/rules/cpp/perf-*.md`, 12 `catalog/rules/cpp/test-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied the five checks per rule.
2. Fetched all 18 cited URLs (all HTTP 200), grepped each for the specific claim, and read the relevant guideline bodies (CG Per.6/7/11/16/17/19, F.5/F.18, ES.56, P.9) and framework docs.
3. Extracted all 48 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran self-contained behavior programs under timeouts: constexpr positive/negative, NRVO vs pessimizing move with move counters, reserve reallocation counting, range-for copy counting, seeded `mt19937` determinism, ASan/UBSan Good/Bad, libFuzzer-entry fallback, endl output equivalence, static-dispatch assembly.
5. Mechanical checks: frontmatter fields, id/path match, section order, exactly one `cpp` fence per Bad/Good, summary ≤ 30 words, snippets ≤ 25 lines, `related` ids and See Also links resolve, no TODO/elisions/hedges, tool ids.
6. Duplicate review within the batch and across `catalog/rules/cpp/`, plus the deterministic validator (`node dist/rules/cli.js validate --lang cpp`): 0 errors/warnings touching these 24.

## Source verification (evidence quotes)

- **CG Per.19** — "Performance is very sensitive to cache performance, and cache algorithms favor simple (usually linear) access to adjacent data."; the doc's matrix example is exactly the rule's Bad/Good. (`perf-contiguous-access`)
- **CG Per.16 / Per.17** — "Performance is typically dominated by memory access times."; "Declare the most used member of a time-critical struct first." (`perf-compact-hot-data`)
- **CG Per.6 / Per.2 / Per.4 / Per.5** — "Don't make claims about performance without measurements"; "Don't optimize prematurely"; "Modern hardware and optimizers defy naive assumptions; even experts are regularly surprised." (`perf-measure-first`)
- **CG F.5** — "If a function is very small and time-critical, declare it inline"; "Specifying inline (explicitly, or implicitly when writing member functions inside a class definition) encourages the compiler to do a better job." (`perf-inline-small`)
- **CG F.18** — "For 'will-move-from' parameters, pass by X&& and std::move the parameter." (`perf-sink-move`); cppreference `move_constructor` — "Move constructors typically transfer the resources held by the argument ... rather than make copies of them".
- **CG ES.56** — "Never write return move(local_variable);, because the language already knows the variable is a move candidate."; cppreference `copy_elision` — NRVO applies when "the operand is the name of a non-volatile object with automatic storage duration"; "constructs the returned T directly; no move". (`perf-no-return-move`)
- **CG Per.11** — "Move computation from run time to compile time"; "To decrease code size and run time. To avoid data races by using constants. To catch errors at compile time"; "you can't have a data race on a constant." (`perf-constexpr`)
- **CG P.9** — exact `lower(zstring)` example with `i < strlen(s)` in the condition; "strlen must walk through string every loop ... it's better to cache the length outside the loop." (`perf-hoist-loop-work`)
- **CG Per.7** — qsort "deprives the compiler of information needed for optimization"; template sort "use the compiler's knowledge about the size of the array, the type of elements"; "pass sufficient information for a good implementation to be chosen." (`perf-static-dispatch`; mechanism confirmed empirically, see below)
- **cppreference `endl`** — "Use of std::endl in place of '\n' ... may significantly degrade output performance." (`perf-no-endl`)
- **cppreference `vector`** — "The elements are stored contiguously"; "reserve() ... can be used to eliminate reallocations if the number of elements is known in advance." (`perf-contiguous-access`, `perf-reserve-capacity`)
- **clang-tidy `performance-inefficient-vector-operation`** — flags `push_back` "without calling Reserve() before the loop. Calling Reserve() first can avoid ... memory reallocations." (`perf-reserve-capacity`)
- **clang-tidy `performance-for-range-copy`** — "Finds C++11 for ranges where the loop variable is copied in each iteration but it would suffice to obtain it by const reference." (`perf-range-for-refs`); CG also shows `for (const auto& x : v)`.
- **cppreference `constexpr`** — "declares that it is possible to evaluate the value of the entities at compile time." (`perf-constexpr`)
- **cppreference `static_assert`** — "Performs compile-time assertion checking."; on failure "a compile-time error is issued, and the user-provided message ... is included in the diagnostic message." (`test-static-assert`)
- **cppreference `temp_directory_path`** — "Returns the directory location suitable for temporary files"; "guaranteed to exist and to be a directory." (`test-temp-raii`)
- **cppreference `mersenne_twister_engine`** — generation algorithm fully specified; seed constructor; `default_seed 5489u`; `operator==` compares internal states. (`test-seeded-random`)
- **GoogleTest Primer** — "Tests should be independent and repeatable"; "GoogleTest isolates the tests by running each of them on a different object"; "will create a fresh test fixture for each test, immediately initialize it via SetUp(), run the test, clean up"; "write a destructor or TearDown() function"; "Tests should be portable and reusable." (`test-isolation`, `test-fixture-raii`, `test-hermetic`)
- **GoogleTest Advanced Topics** — value-parameterized tests, `INSTANTIATE_TEST_SUITE_P`; `--gtest_filter` and shuffling. (`test-data-driven`, `test-isolation`)
- **GoogleTest Assertions Reference** — `EXPECT_THROW` assertions "verify that a piece of code throws"; "When the assertion fails, it prints the value of each argument." (`test-error-paths`, `test-failure-output`)
- **gMock Cookbook** — mocking via interfaces (`EXPECT_CALL`, mock functions). (`test-interface-seams`)
- **Clang ASan** — detects "Out-of-bounds accesses to heap, stack and globals", "Use-after-free", "Double-free, invalid free"; **UBSan** — "a fast undefined behavior detector", `-fsanitize=undefined`. (`test-sanitizers`)
- **LLVM libFuzzer** — "in-process, coverage-guided, evolutionary fuzzing engine"; entry point `LLVMFuzzerTestOneInput`; "the reproducer is saved on disk" (`crash-<sha1>` artifacts). (`test-fuzz-entry`)

## Framework-free test snippets

The GoogleTest/gMock-cited test rules deliberately show framework-free C++ (no gtest headers locally). The cited docs still back the guidance: primer independence/repeatability and fresh fixture (isolation, fixture-raii, hermetic, temp-raii); parameterized tests (data-driven); `EXPECT_THROW` and "prints the value of each argument" (error-paths, failure-output); gMock mocking through interfaces (interface-seams). Accepted.

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 48/48 snippets: exit 0.
- `perf-no-return-move` Bad: exit 0 with the documented `-Wpessimizing-move` ("moving a local object in a return statement prevents copy elision") at line 5; Good clean. Accepted per instructions (`enforce: both`, tool `clang:-Wpessimizing-move`).

## Behavior results (timeouts applied)

- **constexpr:** `static_assert(factorial(5) == 120)` holds; deliberate false variant fails compilation with "static assertion failed ... expression evaluates to '120 == 119'".
- **copy elision:** NRVO `return result;` → moves=0 copies=0; `return std::move(result);` → moves=1 (with the warning); prvalue → 0 moves/copies.
- **reserve:** 1000 `push_back`s without reserve → 11 reallocations; with `reserve(1000)` → 0 reallocations, capacity unchanged.
- **range-for:** `for (auto x : v)` → 10 copies; `for (const auto& x : v)` → 0 copies; by-value loop cannot mutate, `auto&` loop does.
- **seeded random:** `random_level(12345)` equal across calls; 10000 draws from two `mt19937(5489u)` identical; different seeds diverge.
- **ASan/UBSan:** Good snippet exit 0 clean; Bad snippet reports stack-buffer-overflow (UBSan also flags the insufficient-space load).
- **libFuzzer:** Apple clang does not ship `libclang_rt.fuzzer_osx.a`, so `-fsanitize=fuzzer` cannot link locally; the entry point compiles and runs cleanly when called directly under `-fsanitize=address,undefined` (exit 0), and its signature matches the documented `int LLVMFuzzerTestOneInput(const uint8_t*, size_t)`.
- **static dispatch:** `-O2` assembly — Bad loop has `blr` through the vtable per element; instantiated Good has no indirect calls and vectorizes (SIMD).
- **no-endl:** Bad and Good produce byte-identical output (100 lines).

## Duplicates / consistency

- No duplicate or near-duplicate summaries within the batch (all pairwise Jaccard < 0.5); cross-checks against the rest of `catalog/rules/cpp/` found no duplicate decisions: `perf-static-dispatch` / `perf-range-for-refs` / `perf-reserve-capacity` vs `api-abstract-interface` / `api-param-passing` / `raii-param-ownership` are distinct and correctly cross-linked; `test-static-assert` vs `perf-constexpr` split assertion vs computation; `test-temp-raii` vs `test-hermetic` split unique-temp-dir vs machine independence.
- All `related` ids and See Also links resolve; `INDEX.md` lists exactly these 24 files under perf (12) and test (12); formatting checks clean; deterministic validator reports 0 errors/warnings touching these rules (its remaining errors are other batches' files).
- Minor notes (non-blocking): `test-isolation`'s Why says frameworks "do not define execution order" — the primer backs independence/repeatability and per-test isolation, and Advanced Topics backs filtering/shuffling; GoogleTest does have a default registration order, so the sentence is best read as "order must not be relied on". `perf-static-dispatch`'s mechanism sentence goes beyond Per.7's literal text but is standard compiler behavior, confirmed empirically. `test-temp-raii`'s Good delegates directory creation/removal to the harness in a comment while the Why explains the RAII helper.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-perf-compact-hot-data | verified | CG Per.16/17 quotes; both rc=0 |
| cpp-perf-constexpr | verified | CG Per.11 code-size/races/compile-time quotes; cppref constexpr; static_assert pos/neg behavior; both rc=0 |
| cpp-perf-contiguous-access | verified | CG Per.19 quote + identical matrix example; cppref vector contiguous; both rc=0 |
| cpp-perf-hoist-loop-work | verified | CG P.9 `strlen`-in-condition example; both rc=0 |
| cpp-perf-inline-small | verified | CG F.5 inline/measure quotes; both rc=0 |
| cpp-perf-measure-first | verified | CG Per.6/Per.2/Per.4/Per.5 quotes; chrono measurement behavior; both rc=0 |
| cpp-perf-no-endl | verified | cppref endl "significantly degrade output performance"; outputs identical; both rc=0 |
| cpp-perf-no-return-move | verified | CG ES.56 "Never write return move(...)"; cppref NRVO; Bad fires documented -Wpessimizing-move; behavior moves=1 vs 0; Good rc=0 |
| cpp-perf-range-for-refs | verified | clang-tidy for-range-copy quote; behavior 10 vs 0 copies; both rc=0 |
| cpp-perf-reserve-capacity | verified | clang-tidy inefficient-vector-operation + cppref vector reserve; behavior 11 vs 0 reallocations; both rc=0 |
| cpp-perf-sink-move | verified | CG F.18 exact rule; cppref move_constructor transfer quote; both rc=0 |
| cpp-perf-static-dispatch | verified | CG Per.7 type-information quote; -O2 asm: Bad `blr` vs Good vectorized/no indirect calls; both rc=0 |
| cpp-test-data-driven | verified | gtest Advanced parameterized tests; both rc=0 |
| cpp-test-error-paths | verified | gtest assertions EXPECT_THROW + primer; both rc=0 |
| cpp-test-failure-output | verified | gtest assertions "prints the value of each argument"; both rc=0 |
| cpp-test-fixture-raii | verified | gtest primer fresh-fixture/SetUp/TearDown; both rc=0 |
| cpp-test-fuzz-entry | verified | libFuzzer entry/reproducer + ASan docs; entry runs clean under ASan; both rc=0 (fuzzer runtime unavailable on Apple clang) |
| cpp-test-hermetic | verified | gtest primer "portable and reusable"; both rc=0 |
| cpp-test-interface-seams | verified | gMock cookbook mocking-through-interfaces; both rc=0 |
| cpp-test-isolation | verified | gtest primer independent/repeatable/isolated; Advanced filter/shuffle; both rc=0 |
| cpp-test-sanitizers | verified | ASan OOB/UAF/double-free + UBSan docs; Good clean, Bad caught under ASan; both rc=0 |
| cpp-test-seeded-random | verified | cppref mt19937 specified algorithm/seed; determinism behavior (10000 identical draws); both rc=0 |
| cpp-test-static-assert | verified | cppref static_assert compile-time checking + message; negative case fails compile; both rc=0 |
| cpp-test-temp-raii | verified | cppref temp_directory_path "suitable for temporary files"; both rc=0 |

**Counts: verified 24/24, rejected 0.** All 24 statuses flipped to `verified`.
**Follow-up (outside verifier scope):** `catalog/rules/cpp/INDEX.md` still reads "Rules: 91 (verified: 38)" and the batch-status line; the owning agent must update the verified count and status line.
