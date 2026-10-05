# Verification Report — C++ Batch 10 (proj + ffi)

**Verifier:** adversarial subagent (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 24 draft rules — 12 `catalog/rules/cpp/proj-*.md`, 12 `catalog/rules/cpp/ffi-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23 -Wall`; C mode `clang -x c -std=c17`; ASan/UBSan probes
**Pre-state:** all 24 files `status: draft`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied all four checks per rule.
2. Fetched all 13 distinct cited URLs (cppreference definition, inline, namespace, language_linkage, TriviallyCopyable, StandardLayoutType, enum, preprocessor/include, preprocessor/replace, cv, static_assert, span, pimpl; Core Guidelines) and confirmed each claim against the page text.
3. Extracted all 48 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran focused probes with multi-TU links, `nm` symbol checks, C-mode compiles, and ASan/UBSan runs (probes replicate rule logic; rule snippets unmodified).
5. Mechanical checks: frontmatter fields, id/path match, baseline literal, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words and hedge-free, snippets ≤ 25 lines, `related` IDs and See Also links resolve, INDEX entries, no TODO/elisions/Unicode ellipsis, no linter claims without `enforce: tool`; duplicate review within the batch and against the rest of the pack.

## Source verification (evidence quotes)

- **Definitions and ODR** — "One and only one definition of every non-inline function or variable that is odr-used is required to appear in the entire program … The compiler is not required to diagnose this violation, but the behavior of the program that violates it is undefined"; "For a class, a definition is required wherever the class is used in a way that requires it to be complete"; multiple definitions allowed when "Each definition consists of the same sequence of tokens (typically, appears in the same header)"; the `struct S { int x; }` / `struct S { int y; }` undefined-behavior note. (`proj-header-declares`, `proj-header-class-definition`, `proj-odr-identical-tokens`)
- **inline specifier** — "There may be more than one definition of an inline function … as long as each definition appears in a different translation unit and … all definitions are identical"; "may be defined in a header file that is included in multiple source files"; "Inline const variables at namespace scope have external linkage by default (unlike the non-inline non-volatile const-qualified variables)"; "Inline variables eliminate the main obstacle to packaging C++ code as header-only libraries"; constexpr is implicitly inline. (`proj-header-inline`, `proj-inline-variables`)
- **Namespaces** — using-directive visibility rule ("every name … is visible as if it were declared in the nearest enclosing namespace"); "Unnamed namespaces as well as all namespaces declared directly or indirectly within an unnamed namespace have internal linkage"; "Namespaces provide a method for preventing name conflicts in large projects"; Notes cite SF.7. (`proj-no-using-in-header`, `proj-unnamed-namespace`, `proj-namespace-structure`, `proj-no-unnamed-header`)
- **Language linkage** — language linkage "encapsulates … calling convention, name mangling (name decoration) algorithm"; `"C"` "makes it possible to link with functions written in the C programming language"; "When class members … or non-static member functions appear in a `"C"` language block, the linkage of their types remains `"C++"`"; shared headers must hide `extern "C"` with "an appropriate #ifdef, typically `__cplusplus`". (`ffi-extern-c`, `ffi-templates-not-c`, `ffi-dual-use-header`, `ffi-no-overloads`, `ffi-pointer-and-size`)
- **Replacing text macros** — `__cplusplus` "denotes the version of C++ standard that is being used". (`ffi-dual-use-header`)
- **TriviallyCopyable** — underlying bytes copied into another object, destination "will hold `obj1`'s value"; copied by `std::memcpy` or `std::memmove`. (`ffi-trivial-copyable`)
- **StandardLayoutType** — "Standard layout types are useful for communicating with code written in other programming languages." (`ffi-standard-layout`, `ffi-size-assert`)
- **Enumeration declaration** — "An enumeration has the same size, value representation, and alignment requirements as its underlying type"; unscoped enum without base → implementation-defined integral type, "not larger than `int` unless the value of an enumerator cannot fit". (`ffi-enum-underlying`)
- **static_assert** — compile-time assertion; a failed assertion makes the program ill-formed and emits the message. (`ffi-size-assert`)
- **std::span** — refers to a contiguous sequence; exposition members `data_` pointer and `size_`. (`ffi-pointer-and-size`)
- **PImpl** — "changes to the implementation do not cause recompilation. Consequently, if a library uses pImpl in its ABI, newer versions of the library may change the implementation while remaining ABI-compatible"; unique_ptr as the usual pointer. (`ffi-opaque-handle`, `ffi-cpp-calling-c`)
- **Source file inclusion** — `#include` "replaces the directive by the entire contents"; nested includes processed recursively; header guards. (`proj-self-contained-header`, `proj-include-own-header`, `proj-include-what-you-use`)
- **cv qualifiers** — non-local, non-inline const variable not declared `extern` has internal linkage. (`proj-inline-variables`)
- **Core Guidelines** — SF.2, SF.3, SF.5, SF.7, SF.10, SF.11, SF.20, SF.21, SF.22, CPL.1, CPL.3 all quoted as the rules claim. **CPL.2 is misstated by `ffi-prefer-cpp`** (see Blockers): the guideline reads "If you must use C, use the common subset of C and C++, and **compile the C code as C++**" with Enforcement "Flag if using a build mode that compiles code as C."

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- **48/48 snippets exit 0 with zero output** — no warnings, no errors.

## Behavior results (probes; snippets unmodified)

- **proj-header-declares:** non-inline definition in a header included by two TUs → `duplicate symbol 'widget_count()'`; declare/define split links and runs rc=0.
- **proj-header-inline:** inline definition in a header included by two TUs links and runs rc=0.
- **proj-unnamed-namespace:** external helper in two TUs → duplicate symbol; anonymous-namespace version links rc=0.
- **proj-self-contained-header:** header using `std::string` without `<string>` fails when included alone ("use of undeclared identifier 'std'"); with the include it compiles alone.
- **proj-include-own-header:** same mechanism — own header first surfaces a missing include that a preceding include hides.
- **proj-include-what-you-use:** TU compiles without including `<vector>` when a transitive header pulled it in; removing the transitive include → error.
- **proj-no-using-in-header:** unqualified `string` in the includer accepted only because of the header's `using namespace std;`; without it → "unknown type name 'string'".
- **proj-header-class-definition:** type defined in one .cpp is not nameable in another TU ("unknown type name 'Widget'").
- **proj-inline-variables:** `const int` in a header → different addresses per TU; `inline constexpr` → same address.
- **proj-no-unnamed-header:** header unnamed-namespace counter → different addresses per TU; inline accessor with function-local static → same address.
- **proj-odr-identical-tokens:** TUs defining `Config` with different members link silently at `-Wall`; `sizeof` prints 4 vs 8; ASan/UBSan run rc=0 — no diagnostic, as the source says.
- **proj-namespace-structure:** `nm` shows `__ZN5codec6encodeEi` / `__ZN5codec6decodeEi` — names live in the namespace scope.
- **ffi-extern-c:** `nm` — C++ linkage `__Z6c_openPKci` vs `extern "C"` `_c_open`.
- **ffi-no-overloads:** two overloads → `__Z11widget_openPKc` + `__Z11widget_openPKci`; C caller fails to link ("_widget_open" undefined); distinct C names link and run rc=0.
- **ffi-templates-not-c:** inside `extern "C"`, member function emits `__ZNK6Widget5valueEv`, free function emits `_widget_value`.
- **ffi-dual-use-header:** guarded header compiles as C (`-std=c17`) and as C++; bare `extern "C"` header rejected by the C compiler ("expected identifier or '('").
- **ffi-trivial-copyable / ffi-standard-layout / ffi-enum-underlying:** static_asserts — `Config{int,int}` trivially copyable, `std::string` member not; plain struct standard-layout, virtual / mixed-access structs not; `sizeof` of a `std::uint8_t`-based enum is 1 and `underlying_type_t` is `std::uint8_t`; memcpy roundtrip rc=0 under ASan/UBSan.
- **ffi-size-assert:** `sizeof(Packet) == 8` holds; adding a field fails the build with the custom message ("expression evaluates to '12 == 8'").
- **ffi-opaque-handle + ffi-dual-use-header:** C caller compiled against the opaque header; C++ implementation recompiled with a larger layout relinks against the untouched caller object and runs rc=0 under ASan/UBSan.
- **ffi-cpp-calling-c:** `unique_ptr<void, decltype(&std::free)>` wrapper rc=0 under ASan (no leak).
- **ffi-pointer-and-size:** one C-linkage function called from a C caller and from a C++ `std::span` caller; both rc=0 under ASan/UBSan.

## CMake / build-system scoping

Assessment: **acceptable and contract-implied.** CONTRACT §4 requires the fence language to match the rule's language, and §0/§7 require every Bad/Good snippet to compile under the validator; CMake snippets cannot be compiled by `clang++`, and a `compile_exempt` rule stays `draft` (it can never ship as verified). The pack's `categories.md` reserves `lint — Build and lint tooling (6)` for that territory; no `lint-*` files are authored yet and INDEX has no lint heading, so the exclusion is visible as an unauthored category, not a gap in this batch. `proj` is complete at its target 12 with source-structure rules only. Non-blocking note: `categories.md` titles `proj` "Project structure and build", which overstates what the prefix can deliver under the contract; no doc edit made (outside verifier ownership).

## Duplicates / formatting / links

- No duplicate IDs or near-duplicates within the 24; decisions pairwise distinct. Cross-checks: `ffi-extern-c` vs `ffi-dual-use-header` (mangling vs shared-header guard); `ffi-templates-not-c` vs `ffi-no-overloads` (member/template vs overload names); `ffi-trivial-copyable` vs `ffi-standard-layout` vs `ffi-size-assert` (byte transport vs layout category vs build-time pin); `ffi-prefer-cpp` vs `ffi-cpp-calling-c` (when to use C vs how to call it); `ffi-pointer-and-size` vs `type-span` (C signature vs C++ view); `ffi-opaque-handle` vs `api-c-abi-subset` (complementary: opaque handle vs cross-compiler ABI subset); the `proj` header trio and the unnamed-namespace pair split cleanly.
- Exactly one `cpp` Bad and one `cpp` Good per rule; all snippets ≤ 25 lines; summaries ≤ 30 words, hedge-free; no TODO/FIXME/XXX/TBD, no bare `...` lines, no Unicode ellipsis; all `related` IDs resolve; all See Also files exist; INDEX lists all 24 and prefix targets (proj 12, ffi 12) are met. INDEX summaries are condensed one-liners rather than verbatim copies of the body `>` summary — consistent with CONTRACT §9.
- No linter-enforcement claims; all rules are `enforce: review`.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| cpp-proj-no-using-in-header | verified | Namespaces using-directive rule + SF.7 note; leak probe (unqualified `string` accepted, rejected without directive) | — |
| cpp-proj-header-declares | verified | ODR one-definition + no-diagnostic quotes; SF.2; duplicate-symbol probe | — |
| cpp-proj-header-class-definition | verified | ODR completeness quote; SF.3; incomplete-type probe | — |
| cpp-proj-include-what-you-use | verified | include textual-replacement quote; SF.10; transitive-dependency probe | Bad merges widget.hpp's include and widget.cpp's use via the "shown inline" convention — compiles and conveys the point, attribution less crisp than sibling rules |
| cpp-proj-unnamed-namespace | verified | namespace internal-linkage quote; SF.22; duplicate-symbol vs anon probe | — |
| cpp-proj-namespace-structure | verified | namespace conflict-prevention quote; SF.20; `nm` scope probe | — |
| cpp-proj-header-inline | verified | inline multiple-definition + header example quotes; link probe | "Templates and constexpr functions are implicitly inline": constexpr literal; templates are not literally inline but templated entities have the ODR multiple-definition allowance (both pages cited) |
| cpp-proj-include-own-header | verified | SF.5; include replacement-order quote; header-first probe | — |
| cpp-proj-odr-identical-tokens | verified | ODR token-identity + struct S note quotes; 4-vs-8 silent-link probe under ASan/UBSan | — |
| cpp-proj-no-unnamed-header | verified | SF.21; per-TU internal-linkage quote; distinct-counter probe | — |
| cpp-proj-self-contained-header | verified | SF.11; include recursion quote; header-alone probe | — |
| cpp-proj-inline-variables | verified | inline external-linkage + header-only quotes; cv internal-linkage quote; address-identity probe | — |
| cpp-ffi-dual-use-header | verified | language-linkage `__cplusplus` guard quote; replace macro quote; C and C++ compile probes | — |
| cpp-ffi-size-assert | verified | static_assert quote; StandardLayoutType purpose; assert-pass and field-addition-fail probes | Pins total size only, not offsets; a same-size field reorder would pass — acceptable for a `prefer` rule |
| cpp-ffi-no-overloads | verified | language-linkage mangling quote; mangled-symbol + C-link-failure probe | Bad would be equally unusable without overloads (missing C linkage); overload distinction still verified |
| cpp-ffi-templates-not-c | verified | language-linkage member-function special-rule quote; `nm` member vs free-function probe | — |
| cpp-ffi-enum-underlying | verified | enum size/value-rep/alignment + implementation-defined base quotes; static_assert probe | — |
| cpp-ffi-trivial-copyable | verified | TriviallyCopyable byte-copy + memcpy quote; static_asserts + ASan memcpy roundtrip | — |
| cpp-ffi-standard-layout | verified | StandardLayoutType cross-language purpose quote; virtual/mixed static_asserts | Requirement details live on the linked data_members page; cited page carries the purpose statement |
| cpp-ffi-extern-c | verified | language-linkage `"C"` quote; CPL.3; `nm` mangled vs unmangled probe | — |
| cpp-ffi-pointer-and-size | verified | CPL.3; span data+size; C caller + span caller both rc=0 under ASan/UBSan; bad signature compiles as claimed | — |
| cpp-ffi-cpp-calling-c | verified | CPL.3 quote; pimpl unique_ptr/ownership quotes; ASan wrapper run | Pimpl citation is an analogy ("the pimpl idea applied to foreign resources"); CPL.3 is the load-bearing source |
| cpp-ffi-prefer-cpp | **rejected** | CG CPL.2: "compile the C code as **C++**", Enforcement "Flag if using a build mode that compiles code as C" — rule says "compile it as **C**" | Why contradicts its cited source; leave `draft` |
| cpp-ffi-opaque-handle | verified | pimpl stable-ABI quote; opaque-handle C caller + relink-after-layout-change probe rc=0 | — |

**Counts: verified 23/24, rejected 1.** The 23 passing rules were flipped `status: draft` → `status: verified`; `ffi-prefer-cpp` remains `draft`. No other edits; batch 9 `coll`/`const` files untouched.

## Blockers / follow-ups

- **`cpp-ffi-prefer-cpp` rejected.** The Why misstates CPL.2: the Core Guidelines say "use the common subset of C and C++, and compile the C code as C++" (Enforcement flags building as C), while the rule says "compile it as C." The snippets compile and CPL.1/CPL.3 support the rest, so the fix is to repair or drop that sentence (e.g. "compile the common subset as C++") and re-verify; the file was left `draft`.
- Non-blocking notes (kept as-is): `proj-header-inline` "templates are implicitly inline" wording; `ffi-size-assert` size-only pin; `proj-include-what-you-use` Bad file attribution; `ffi-standard-layout` details on the linked page; `ffi-cpp-calling-c` pimpl analogy.
- INDEX header verified count (187) is stale after these 23 flips (→ 210). INDEX updates are outside verifier ownership.
- `lint` / `init` categories are planned in `categories.md` but unauthored; no batch-10 impact.

**Addendum (re-verification, same date):** `cpp-ffi-prefer-cpp` was repaired — title/summary/Why now state CPL.2 as written ("use the common subset of C and C++, and compile the C code as C++"; subset "can be compiled with both C and C++ compilers, and when compiled as C++ is better type checked"), both snippets compile and run rc=0 under ASan/UBSan, related/See Also links resolve — so it is flipped to `verified`: **final count verified 24/24, rejected 0** (follow-up, outside verifier ownership: `INDEX.md`'s `ffi-prefer-cpp` one-liner still reads "C for code compiled as C", and the INDEX verified count 187 is now stale by 24 → 211).
