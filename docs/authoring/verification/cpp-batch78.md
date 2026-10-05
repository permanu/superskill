# Verification Report — C++ Batch 7+8 (doc + num + str + macro)

**Verifier:** adversarial (separate context; did not author these rules; prior verifiers died to an infrastructure limit — re-verified from the current on-disk state)
**Date:** 2026-10-05
**Scope:** 48 draft rules — 12 `catalog/rules/cpp/doc-*.md`, 12 `num-*.md`, 12 `str-*.md`, 12 `macro-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23 -Wall`; UBSan/ASan probes
**Pre-state:** all 48 files `status: draft` (no statuses had been flipped)

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied all four checks per rule.
2. Fetched all 29 distinct cited URLs (all HTTP 200) and grepped each for the exact claim (Doxygen docblocks/commands/grouping; cppreference comment, deprecated, conditional, types, duration, numeric_limits, constants, intcmp, integer, midpoint, to_chars, from_chars, replace, include, assert, if, constexpr, getline, tolower, quoted, basic_string, basic_string_view, basic_istream, exception, system_clock; Core Guidelines NL/ES/SL/P sections).
3. Extracted all 96 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`, then linked and ran the safe cases under 15 s timeouts.
4. Ran focused probes (not edits of the rules) with UBSan/ASan for the guard/lifetime/overflow cases; verified comment semantics of the 12 `doc` rules manually beyond compilation.
5. Mechanical checks: frontmatter fields, id/path match, baseline literal, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words and hedge-free, snippets ≤ 25 lines, `related` IDs and See Also links resolve, trigger keyword counts, no TODO/elisions/Unicode ellipsis, no linter claims without `enforce: tool`; duplicate review within the batch and against the rest of the pack; deterministic validator (`node dist/rules/cli.js validate --lang cpp --json`).

## Source verification (evidence quotes)

- **Doxygen docblocks** — "The brief descriptions are included in the member overview of a class, namespace or file"; "For the HTML output brief descriptions are also used to provide tooltips"; "A special comment block is a C or C++ style comment block with some additional markings, so Doxygen knows it is a piece of structured text that needs to end up in the generated documentation"; "to document global objects (functions, typedefs, enum, macros, etc), you must document the file … there must at least be a `/*! \file */` or a `/** @file */` line"; "the need to put a structural command inside the documentation block … leads to some duplication of information. So in practice you should avoid the use of structural commands". (`doc-brief`, `doc-public-api`, `doc-file`, `doc-structural`)
- **Doxygen commands** — `\param` "has an optional attribute … Possible values are `[in]`, `[out]`, and `[in,out]`"; `\exception <exception-object> { exception description }` documented; `\throw`/`\throws`/`\exception` in the command list; `\file` — "The documentation of global functions, variables, typedefs, and enums will only be included in the output if the file they are in is documented as well"; `\fn` — "This command is only needed if a comment block is not placed in front … this command can (and to avoid redundancy should) be omitted"; "Structural commands (like all other commands) start with a backslash (\), or an at-sign (@)". (`doc-params`, `doc-throws`, `doc-file`, `doc-structural`)
- **Doxygen grouping** — "Grouping is a way to group things together on a separate page, called a topic"; "Groups themselves can also be nested using these grouping markers"; `@defgroup`/`@{`/`@}` example. (`doc-group`)
- **cppreference comment** — "C-style comments cannot be nested"; "other mechanisms used for source code exclusion are `#if 0` … `#endif`". (`doc-comment-out`)
- **cppreference deprecated** — "Indicates that the use of the name or entity … is allowed, but discouraged"; "Compilers typically issue warnings on such uses. The string-literal, if specified, is usually included in the warnings." (`doc-deprecated`)
- **Core Guidelines** — NL.1 "Don't say in comments what can be clearly stated in code"; NL.2 "State intent in comments"; NL.3 "Keep comments crisp" (verbosity slows understanding); NL.9 "Use ALL_CAPS for macro names only"; P.1 "Express ideas directly in code"; ES.30 "Don't use macros for program text manipulation"; ES.31 "Don't use macros for constants or 'functions'"; ES.32 "Use ALL_CAPS for all macro names"; ES.33 "If you must use macros, give them unique names" (macros do not obey scope rules); ES.34 "Don't define a (C-style) variadic function" (not type safe); ES.100 "Don't mix signed and unsigned arithmetic"; ES.101 "Use unsigned types for bit manipulation" (no surprises from sign bits); ES.102 "Use signed types for arithmetic"; ES.103 "Don't overflow"; ES.104 "Don't underflow"; ES.105 "Don't divide by integer zero" (result undefined); ES.106 "Don't try to avoid negative values by using unsigned"; SL.str.1 "Use std::string to own character sequences"; SL.str.5 "Use std::byte to refer to byte values that do not necessarily represent characters".
- **cppreference numeric_limits** — "standardized way to query properties"; macro/member table maps `SHRT_MAX` → `max()`, `INT_MIN` → `min()`; `lowest()`/`digits` members. (`num-limits`)
- **cppreference numbers** — `inline constexpr double pi` plus `pi_v` variable template. (`num-constants`)
- **cppreference duration** — "consists of a count of ticks of type Rep and a tick period … Period is included as part of the duration's type, and is only used when converting between different durations"; predefined `milliseconds`/`seconds`. (`num-duration`)
- **cppreference integer/types** — "width of exactly N … bits and no padding bits"; `int` "at least 16 bits", `long` "at least 32 bits"; "Format macro constants — Defined in header `<cinttypes>`". (`num-fixed-width`)
- **cppreference intcmp** — "negative signed integers always compare less than (and not equal to) unsigned integers: the comparison is safe against non-value-preserving integer conversion"; signatures are `constexpr … noexcept`. (`num-intcmp`)
- **cppreference midpoint** — "Half the sum of a and b. No overflow occurs. If a and b have integer type and the sum is odd, the result is rounded towards a. If a and b have floating-point type, at most one inexact operation occurs." (`num-midpoint`)
- **cppreference to_chars** — "locale-independent, non-allocating, and non-throwing"; "On success … ptr is the one-past-the-end pointer of the characters written. Note that the string is not NUL-terminated"; `value_too_large` on error. (`num-to-chars`)
- **cppreference from_chars** — `invalid_argument` / `result_out_of_range` in `ec`, `ptr` marks the first non-matching character; locale-independent, non-allocating, non-throwing. (`str-parse-numbers`)
- **cppreference basic_string** — Data members: "`constexpr size_type npos [static]` the special value `size_type(-1)`, its exact meaning depends on the context"; "References, pointers, and iterators referring to the elements of a basic_string may be invalidated by any standard library function taking a reference to non-const basic_string as an argument … and by calling non-const member functions, except `operator[]`, `at`, `data`, `front`, `back`, `begin`, `rbegin`, `end`, and `rend`"; `starts_with`/`ends_with`/`contains`/`substr` listed; `c_str` returns the C array. (`str-npos-check`, `str-view-invalidation`, `str-cstr-boundary`, `str-starts-with`, `str-substr-view`)
- **cppreference basic_string_view** — "It is the programmer's responsibility to ensure that `std::string_view` does not outlive the pointed-to character array". (`str-view-lifetime`)
- **cppreference getline** — delimiter "is extracted from input, but is not appended to str"; "If no characters were extracted for whatever reason … getline sets failbit". (`str-getline`)
- **cppreference tolower** — "If the value of ch is not representable as unsigned char and does not equal EOF, the behavior is undefined"; Notes give the `static_cast<unsigned char>` fix and extend it to standard algorithms. (`str-ctype-unsigned`)
- **cppreference quoted** — "insertion and extraction of quoted strings, such as the ones found in CSV or XML"; extraction "Turns off the skipws flag … whenever an escape character is extracted, it is ignored and the next character is appended … stops … when an unescaped delim character is found". (`str-quoted`)
- **cppreference assert** — "If NDEBUG is defined … the assertion is disabled: assert does nothing." (`macro-assert-side-effects`)
- **cppreference include** — "To avoid repeated inclusion of the same file and endless recursion … header guards are commonly used"; guard name "uniquely mapped to file name"; "Many compilers also implement the non-standard pragma `#pragma once`"; "`__has_include` expression evaluates to 1 if the search … succeeds"; "can be expanded in the expression of `#if` and `#elif`"; "result of 1 only means that a header or source file with the specified name exists. It does not mean that the header or source file, when included, would not cause an error or would contain anything useful." (`macro-include-guard`, `macro-has-include`)
- **cppreference if** — "Outside a template, a discarded statement is fully checked. `if constexpr` is not a substitute for the `#if` preprocessing directive." (`macro-if-constexpr`)
- **cppreference replace** — function-like macro parameters "replace corresponding occurrences of any of the parameters in the replacement-list"; "`##` operands are not macro-expanded before pasting" and commas in template argument lists split macro arguments unless parenthesized; redefinition "is ill-formed unless the definitions are identical"; "#undef … cancels previous definition … If the identifier does not have associated macro, the directive is ignored"; "may not #define or #undef names declared in any standard library header"; names "lexically identical to: keywords … any standard attribute token" are UB otherwise. (`macro-inline-function`, `macro-no-program-text`, `macro-no-side-effects`, `macro-undef-helper`, `macro-unique-prefix`)

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 96/96 snippets exit 0. No warnings except the intended `-Wreturn-stack-address` on `str-cstr-boundary` Bad ("address of stack memory associated with local variable 'name' returned") — evidence the anti-pattern is real.
- All 96 also link; all Good snippets run rc=0.

## Behavior results (timeouts applied; probes replicate rule logic, snippets unmodified)

- **num-avoid-overflow:** UBSan guard probe — `INT_MAX+1`, `INT_MAX+INT_MAX`, `INT_MIN-1`, `INT_MIN+INT_MIN`, `-1+INT_MIN` all throw `overflow_error`; `INT_MAX+0`, `INT_MIN+0`, `INT_MAX+INT_MIN = -1`, `INT_MIN+1` compute correctly; rc=0.
- **num-divide-zero:** UBSan detects "division by zero" on Bad (arm64 silently yields 0); Good throws `invalid_argument` for count=0 and returns 2 for (6,3).
- **num-midpoint:** UBSan detects "signed integer overflow: 2000000000 + 2000000000" on Bad; Good rc=0.
- **num-intcmp:** probe — `cmp_less(-1,10u)` true, `cmp_greater(10u,-1)` true, `cmp_less(-1,0u)` true; raw `-1 < 10u` is false (Bad rc=1, Good rc=0).
- **num-limits:** probe — range checks correct at `SHRT_MIN/MAX` ± 1; `numeric_limits<int>::max() == INT_MAX`, `min() == INT_MIN`.
- **num-to-chars:** probe — `to_chars` writes "42" without NUL; 4-byte buffer → `value_too_large`.
- **str-parse-numbers:** probe — "42" parses; "42junk", "junk", and an over-range numeral throw `invalid_argument`.
- **str-npos-check:** probe — with "novalue", `find('=')` returns npos and `substr(npos+1)` wraps to `substr(0)` returning the whole string; checked path returns 1.
- **str-quoted:** probe — round trip preserves `hello "wor\ld" with spaces`; raw `>>` keeps only "hello".
- **str-view-invalidation:** ASan probe — view held across a reallocating append → heap-use-after-free (the Bad's shown 5→12-char append stays in SSO, so it does not reallocate locally).
- **str-view-lifetime:** ASan — Bad → stack-use-after-return; Good rc=0.
- **str-cstr-boundary:** ASan — Bad → stack-use-after-return at `main`; Good rc=0.
- **str-ctype-unsigned / str-getline / str-byte-vs-char / str-own-with-string / str-starts-with / str-substr-view / str-duration / num-constants / num-signed-arithmetic / num-unsigned-bitops / num-fixed-width:** Good rc=0; claims exercised by the shown inputs.
- **macro-assert-side-effects:** Bad without `-DNDEBUG` rc=0 (side effect ran); with `-DNDEBUG` rc=1 (assert vanished, side effect lost).
- **macro-inline-function:** Bad `SQUARE(1+2)` expands to 5 (rc=1); probe confirms.
- **macro-no-side-effects:** probe — `MAX(next(),0)` evaluates `next()` twice (calls==2); the Bad's shown `MAX(next(),3)` happens to evaluate once because the condition is false.
- **macro-has-include / macro-if-constexpr / macro-include-guard / macro-constexpr / macro-all-caps / macro-no-program-text / macro-no-variadic-c / macro-undef-helper / macro-unique-prefix:** Good rc=0; Bad demonstrates its point (variadic sum type-checked by fold expression, etc.).

## Duplicates / formatting / links

- Deterministic validator (`validate --lang cpp --json`): **zero errors and zero warnings touching the 48 batch files** (both before and after the flips). The post-flip run surfaced 13 errors in files authored concurrently by other sessions (`coll-map-find.md` fm-parse; `proj-*.md` index/related) — outside this batch and not caused by these flips.
- No duplicate IDs; titles/summaries pairwise distinct; semantic cross-links reviewed: NL.1/NL.2/NL.3 trio distinct; ES.100 vs intcmp vs ES.102 distinct; ES.101 vs ES.102 complementary; overflow vs midpoint vs divide-zero distinct; to_chars vs from_chars inverse; view lifetime vs invalidation vs c_str boundary distinct; ES.30/31/32/33/34 split cleanly; assert-side-effects vs no-side-effects distinct (NDEBUG vs substitution).
- All `related` IDs and See Also links resolve; `INDEX.md` lists all 48 (headings: doc 12, macro 12, num 12, str 12).

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| cpp-doc-brief | verified | Doxygen brief/tooltip quotes; 2/2 compile+run | Bad is a plain comment, not a doc block; hazard conveyed anyway |
| cpp-doc-comment-out | verified | cppref "C-style comments cannot be nested" + `#if 0` exclusion; 2/2 compile | Bad has no inner terminator, so the nesting failure is not exercised |
| cpp-doc-crisp | verified | CG NL.3 + verbosity reason; 2/2 compile | — |
| cpp-doc-deprecated | verified | cppref deprecated "allowed, but discouraged"; warnings + string-literal quotes | — |
| cpp-doc-file | verified | docblocks `@file` requirement + commands `\file` globals note | — |
| cpp-doc-group | verified | grouping "topic", nesting, `@defgroup`/`@{}` | — |
| cpp-doc-no-restate | verified | CG NL.1 + P.1 | — |
| cpp-doc-params | verified | `\param` + `[in]/[out]/[in,out]` | — |
| cpp-doc-public-api | verified | docblocks special-comment-block + brief/detailed | — |
| cpp-doc-structural | verified | docblocks duplication/avoid + `\fn` omission | — |
| cpp-doc-throws | verified | `\exception` section + `\throw`/`\throws` in command list | — |
| cpp-doc-why | verified | CG NL.2 | — |
| cpp-num-avoid-overflow | verified | ES.103/104; UBSan probe all boundary cases correct | — |
| cpp-num-constants | verified | `pi` + `pi_v` inline constexpr; rc=0 | — |
| cpp-num-divide-zero | verified | ES.105; UBSan "division by zero" on Bad; Good throws | — |
| cpp-num-duration | verified | duration count+period quote; Good sleeps 500 ms rc=0 | second source `system_clock` is surplus to the Why |
| cpp-num-fixed-width | verified | "exactly N bits and no padding"; types minimum widths; `<cinttypes>` macros | — |
| cpp-num-intcmp | verified | intcmp quote + constexpr/noexcept; probe comparisons correct | — |
| cpp-num-limits | verified | macro/member mapping quote; boundary probe | Bad's shown input (10) is in range; lower-bound miss real |
| cpp-num-midpoint | verified | midpoint quote; UBSan overflow on Bad; Good rc=0 | — |
| cpp-num-no-mixed-sign | verified | ES.100; Bad rc=1 / Good rc=0 | — |
| cpp-num-signed-arithmetic | verified | ES.102/ES.106; Good throws, Bad wraps | Bad's harness returns 0 (wrap ≠ 0); comment carries the point |
| cpp-num-to-chars | verified | to_chars quotes incl. "not NUL-terminated"; probes | — |
| cpp-num-unsigned-bitops | verified | ES.101 "without surprises from sign bits" | — |
| cpp-str-byte-vs-char | verified | CG SL.str.5 exact title; rc=0 | — |
| cpp-str-cstr-boundary | verified | basic_string invalidation paragraph; ASan stack-use-after-return; `-Wreturn-stack-address` | — |
| cpp-str-ctype-unsigned | verified | tolower UB domain + Notes cast/algorithms fix | Bad's shown "ABC" is benign; hazard is for negative chars |
| cpp-str-getline | verified | delimiter extracted/not appended; failbit quote | Bad's harness input succeeds; comment carries the point |
| cpp-str-npos-check | verified | basic_string data member "the special value size_type(-1)"; probe shows npos+1 wrap | Bad's shown input contains '='; failure mode verified separately |
| cpp-str-own-with-string | verified | CG SL.str.1; rc=0 | — |
| cpp-str-parse-numbers | verified | from_chars `ec`/`ptr` quotes; probe rejects garbage/overflow | Bad's harness input is accepted silently as intended |
| cpp-str-quoted | verified | quoted CSV/XML + extraction rules; probe round trip with escapes | — |
| cpp-str-starts-with | verified | starts_with/ends_with/contains on both pages; rc=0 | — |
| cpp-str-substr-view | verified | string::substr vs view::substr; rc=0 | Good uses unchecked `find('@')+1` (see cpp-str-npos-check); shown input has '@' and cross-link present |
| cpp-str-view-invalidation | verified | basic_string invalidation quote; ASan heap-use-after-free probe | Bad's short append stays in SSO, so no realloc locally |
| cpp-str-view-lifetime | verified | string_view Notes "programmer's responsibility … does not outlive"; ASan stack-use-after-return | — |
| cpp-macro-all-caps | verified | ES.32 + NL.9 | — |
| cpp-macro-assert-side-effects | verified | assert NDEBUG quote; NDEBUG run loses side effect (rc=1 vs 0) | — |
| cpp-macro-constexpr | verified | ES.31 | — |
| cpp-macro-has-include | verified | `__has_include` in `#if/#elif` + caution quote | — |
| cpp-macro-if-constexpr | verified | "Outside a template … fully checked"; "not a substitute for #if" | — |
| cpp-macro-include-guard | verified | include-guard purpose + unique name + `#pragma once` quote | — |
| cpp-macro-inline-function | verified | replace-list quote; Bad expands to 5 (rc=1) | — |
| cpp-macro-no-program-text | verified | ES.30; `##` no-expand + template-comma note | — |
| cpp-macro-no-side-effects | verified | replace-list quote; probe `MAX(next(),0)` calls twice | Bad's shown `MAX(next(),3)` evaluates once (condition false) |
| cpp-macro-no-variadic-c | verified | ES.34 "Not type safe"; fold Good rc=0 | — |
| cpp-macro-undef-helper | verified | `#undef` cancel/ignore + identical-redefinition quotes | — |
| cpp-macro-unique-prefix | verified | ES.33 "macros do not obey scope rules"; reserved-name quotes | — |

**Counts: verified 48/48, rejected 0.** All 48 `status: draft` → `status: verified` flipped; no other edits.

## Blockers / follow-ups (outside verifier scope)

- `catalog/rules/cpp/INDEX.md` header still reads `Rules: 211 (verified: 139)`; after these 48 flips the verified count should be 187. INDEX updates are not in this verifier's ownership.
- Concurrent authoring by other sessions added `coll-*`/`proj-*` files during verification; the deterministic validator now reports 13 errors there (`coll-map-find` fm-parse; `proj-*` index-missing / related-unresolved). None touch the 48 rules in this batch.
- Non-blocking style notes (kept as-is; each hazard independently verified): several Bad snippets describe but do not exercise their failure on the shown input — `doc-brief`, `doc-comment-out`, `str-npos-check`, `str-view-invalidation`, `macro-no-side-effects`, `num-limits`, `num-signed-arithmetic`, `str-getline`, `str-parse-numbers`, `str-ctype-unsigned`; `num-duration` carries a surplus `system_clock` citation; `str-substr-view`'s Good uses an unchecked `find()+1` while the pack's `str-npos-check` is `must` (cross-linked in See Also).
