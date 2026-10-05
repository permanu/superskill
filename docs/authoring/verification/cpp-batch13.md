# Verification Report — C++ Batch 13 (init + anti)

**Verifier:** adversarial subagent (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 16 draft rules — 9 `catalog/rules/cpp/init-*.md`, 7 `catalog/rules/cpp/anti-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23 -Wall`; ASan+UBSan runs with 20 s timeouts
**Pre-state:** all 16 files `status: draft`
**Out of scope / untouched:** batch 12 `tmpl-*`/`trait-*` files (separate verifier); no git operations

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied all four checks per rule.
2. Fetched all 14 distinct cited URLs (Core Guidelines; cppreference list_initialization, data_members, constructor, default_constructor, virtual, storage_duration, explicit_cast, switch, scope, constexpr, namespace, eval_order, default_initialization) — all HTTP 200 — and confirmed each Why claim against the page text.
3. Extracted all 32 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Compiled all 32 snippets with `-g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer` and ran each with a 20 s timeout; snippets unmodified.
5. Mechanical checks: frontmatter fields, id/path match, baseline literal, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words, snippets ≤ 25 lines, `related` IDs and See Also links resolve, INDEX entries, no TODO/elisions/Unicode ellipsis, no linter claims; duplicate review within the batch and against the whole cpp pack (token Jaccard over titles + summaries, thresholds 0.5/0.35).
6. Re-ran the deterministic validator: `node dist/rules/cli.js validate --lang cpp --no-compile --json` — 0 errors in the 16 batch files (2 comment-elision warnings, see below); the 5 pack errors are `async-*` files outside this batch.

## Source verification (evidence quotes)

- **Core Guidelines** — ES.23, C.49, C.48, C.47, ES.21, ES.22, C.51, C.82, ES.63, ES.78, ES.45, ES.40, SF.6, SF.7, ES.12, ES.48, ES.49, C.80 all matched verbatim as cited (e.g. "ES.23: Prefer the {} -initializer syntax", "C.47: Define and initialize data members in the order of member declaration", "C.82: Don't call virtual functions in constructors and destructors"). ES.23's Reason: "The rules for {} initialization are simpler, more general, less ambiguous, and safer than for other forms of initialization… Avoid () initialization, which allows parsing ambiguities." (init-brace-init; the other 15 rules' C-rules likewise).
- **list-initialization** — "with the restriction that only non-narrowing conversions are allowed"; "If a narrowing conversion is required to initialize any of the elements, the program is ill-formed"; "brace-enclosed initializer list is not an expression and therefore has no type". (`init-brace-init`)
- **Constructors / member initializer lists** — "Before the compound statement that forms the function body of the constructor begins executing, initialization of all direct bases, virtual bases, and non-static data members is finished"; "such as members of reference and const-qualified types, member initializers must be specified"; "The order of member initializers in the list is irrelevant, the actual order of initialization is as follows: … 3) Then, non-static data member are initialized in order of declaration … 4) Finally, the body of the constructor is executed"; delegating: "the list must consist of that one member initializer only … the target constructor is selected by overload resolution and executed first, then the control returns to the delegating constructor and its body is executed." (`init-init-not-assign`, `init-member-order`, `init-delegating`)
- **Non-static data members** — default member initializer is "a brace or equals initializer included in the member declaration and is used if the member is omitted from the member initializer list of a constructor"; "If a member has a default member initializer and also appears in the member initialization list in a constructor, the default member initializer is ignored for that constructor." (`init-nsdmi`)
- **Default constructors** — trivial iff "not user-provided"; a "user-provided constructor may get treated differently than those with an implicitly-defined default constructor during value initialization"; "explicitly-defaulted default constructor … implicitly-defined by the compiler when odr-used"; "has an exception specification as described in … noexcept specification". (`init-defaulted-ctor`)
- **virtual specifier** — "When a virtual function is called directly or indirectly from a constructor or from a destructor … the function called is the final overrider in the constructor's or destructor's class and not one overriding it in a more-derived class. In other words, during construction or destruction, the more-derived classes do not exist."; "if a derived class is handled using pointer or reference to the base class, a call to an overridden virtual function would invoke the behavior defined in the derived class." (`init-virtual-call`, `anti-slice`)
- **Storage class specifiers** — block statics are "initialized the first time control passes through their declaration"; "On all further calls, the declaration is skipped"; "If multiple threads attempt to initialize the same static local variable concurrently, the initialization occurs exactly once." (`init-static-local`)
- **Explicit type conversion** — C-style cast: "the compiler attempts to interpret it as the following cast expressions, in this order: a) const_cast; b) static_cast, with extensions; c) a static_cast (with extensions) followed by const_cast; d) reinterpret_cast; e) a reinterpret_cast followed by const_cast. The first choice that satisfies the requirements of the respective cast operator is selected, even if it is ill-formed." (`anti-c-style-cast`)
- **switch** — "case and default labels in themselves do not alter the flow of control"; "Compilers may issue warnings on fallthrough (reaching the next case or default label without a break) unless the attribute [[fallthrough]] appears immediately before the case label to indicate that the fallthrough is intentional." (`anti-fallthrough`)
- **Scope** — "Within a scope, unqualified name lookup can be used to associate a name with its declaration"; "The locus of a name declared in a simple declaration is immediately after that name's declarator and before its initializer"; block-scope example: `for (int i = 0; …) … int j = i; // j = 42` (inner `i` inhabits the block scope, outer name returns after it). (`anti-shadowing`)
- **constexpr** — "The constexpr specifier declares that it is possible to evaluate the value of the entities at compile time." (`anti-magic-constants`)
- **Namespaces** — "From the point of view of unqualified name lookup of any name after a using-directive and until the end of the scope in which it appears, every name from ns-name is visible as if it were declared in the nearest enclosing namespace which contains both the using-directive and ns-name." (`anti-using-directive`)
- **Order of evaluation** — "Order of evaluation of any part of any expression, including order of evaluation of function arguments is unspecified (with some exceptions listed below)." (`anti-complicated-expression`)
- **Default-initialization** — object "retains an indeterminate value until that value is replaced"; "Every other use of an indeterminate value is undefined behavior." (`init-declare-at-use`)

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- **32/32 snippets exit 0.** The four intended Bad diagnostics appear exactly as documented: `-Wliteral-conversion` and `-Wvexing-parse` (`init-brace-init` Bad), `-Wreorder-ctor` (`init-member-order` Bad), `-Wshift-op-parentheses` (`anti-complicated-expression` Bad). No other warnings or errors on any snippet.

## Behavior results (ASan/UBSan, 20 s timeouts; snippets unmodified)

- **32/32 compiled and ran; no sanitizer report on any snippet.**
- All 16 Good snippets rc=0.
- Bad snippets: 15 rc=0; `anti-slice` Bad rc=1 — intended evidence of the bug (the by-value `Base` copy loses the override, so `describe(derived) == "derived"` is false, matching the snippet comment `// gets "base"`). All other Bad snippets reproduce their documented behavior (e.g. `init-brace-init` Bad count==3, `init-member-order` Bad first==1, `anti-complicated-expression` Bad result==24, `anti-fallthrough` Bad classify(1)==3, `anti-magic-constants` Bad 100*0.85==85.0).
- `init-static-local` Bad (heap `new` in a static pointer) ran clean; the allocation stays reachable from the static root, so LeakSanitizer does not flag it — the rule's point is the hand-rolled lifetime/race risk, not a detected leak in this snippet.

## Duplicates / formatting / links

- No duplicate IDs anywhere in the catalog (1,970 IDs checked); no near-duplicate pair within the batch or against the cpp pack at Jaccard ≥ 0.35 over title+summary tokens. Manual review of the closest families: `init-nsdmi` vs `init-init-not-assign` (declaration defaults vs constructor list), `init-declare-at-use` vs `anti-shadowing` (when to declare vs name reuse), `anti-using-directive` vs `cpp-proj-no-using-in-header` (file scope generally vs headers specifically — See Also relates them), `anti-c-style-cast` vs `cpp-sec-no-type-punning`/`cpp-unsafe-invalid-downcast` (cast form vs specific cast hazards).
- Exactly one `cpp` Bad and one `cpp` Good per rule; all snippets ≤ 25 lines; sections in the exact order Why → Bad → Good → See Also; frontmatter fields complete; `baseline: latest`; no version numbers in bodies; summaries ≤ 30 words; no TODO/FIXME/XXX/TBD, no bare `...` lines, no Unicode ellipsis.
- All `related` IDs resolve; all See Also files exist and link text matches the target's `id`; INDEX lists all 16.
- Deterministic validator (`validate --lang cpp --no-compile`): 0 errors, 2 warnings — `comment-elision` on `init-declare-at-use.md` lines 13/15 (`...` inside comments), which CONTRACT §12 classifies as warnings that do not block verification.
- Non-blocking notes: `init-brace-init` Bad comment says the `()` narrowing happens "without complaint", while clang `-Wall` does emit `-Wliteral-conversion` (a warning, not an error — the intended diagnostic); `init-static-local` Why contains "usually" (hedge warning); `init-declare-at-use` Why reflects the pre-C++26 indeterminate-value model (harness baseline is C++23); the 16 summaries are descriptive ("A/An/The…") rather than imperative — 67 already-verified cpp rules share that style and the validator does not enforce mood.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| cpp-init-brace-init | verified | ES.23 Reason + list_init "only non-narrowing conversions are allowed" / "program is ill-formed" / "not an expression…no type"; Bad `-Wliteral-conversion` + `-Wvexing-parse`; Good rc=0 | "without complaint" is a warning not an error on clang; intended diagnostic documented |
| cpp-init-init-not-assign | verified | C.49; constructor page init-finished-before-body + reference/const-members-must-be-initialized quotes; both rc=0 | — |
| cpp-init-static-local | verified | storage_duration first-pass / "declaration is skipped" / "exactly once" quotes; both rc=0, no sanitizer findings | hedge "usually" (non-blocking) |
| cpp-init-nsdmi | verified | C.48; data_members NSDMI definition + "ignored for that constructor" quote; both rc=0 | — |
| cpp-init-member-order | verified | C.47; constructor page "order…irrelevant" + items 3/4; Bad `-Wreorder-ctor`; Good rc=0 | — |
| cpp-init-declare-at-use | verified | ES.21/ES.22; default_init "indeterminate value until that value is replaced" + "Every other use…undefined behavior"; both rc=0 | pre-C++26 model, C++23 harness; 2 comment-elision warnings |
| cpp-init-delegating | verified | C.51; constructor page "list must consist of that one member initializer only" + target-executed-first quote; both rc=0 | — |
| cpp-init-virtual-call | verified | C.82; virtual page final-overrider + "more-derived classes do not exist" quotes; both rc=0 | — |
| cpp-init-defaulted-ctor | verified | C.80; default_constructor trivial-iff-not-user-provided + value-init difference + implicit-definition/exception-spec quotes; both rc=0 | — |
| cpp-anti-slice | verified | ES.63; virtual page pointer/reference dispatch quote; Bad rc=1 (gets "base"), Good rc=0 | rc=1 is the intended demonstration |
| cpp-anti-fallthrough | verified | ES.78; switch page "labels…do not alter the flow of control" + warning-unless-`[[fallthrough]]` quote; both rc=0 | clang `-Wall` itself does not warn on the Bad; GCC-style warnings are the claim |
| cpp-anti-magic-constants | verified | ES.45; constexpr "possible to evaluate…at compile time" quote; both rc=0 | — |
| cpp-anti-complicated-expression | verified | ES.40; eval_order "unspecified" quote; Bad `-Wshift-op-parentheses`; Good rc=0 | — |
| cpp-anti-using-directive | verified | SF.6/SF.7; namespace page "from the point of view of unqualified name lookup…" quote; both rc=0 | — |
| cpp-anti-shadowing | verified | ES.12; scope page lookup/locus quotes + inner-`i` block example; both rc=0 | — |
| cpp-anti-c-style-cast | verified | ES.48/ES.49; explicit_cast five-step chain + "first choice…even if it is ill-formed" quote; both rc=0 | — |

**Counts: verified 16/16, rejected 0.** All 16 rules were flipped `status: draft` → `status: verified`. No other edits; batch 12 `tmpl`/`trait` files untouched; no git operations.

## Blockers / follow-ups

- None blocking. The 16 rules ship as verified.
- Non-blocking notes kept as-is (listed above): `init-brace-init` Bad comment vs `-Wliteral-conversion`; `init-static-local` "usually"; `init-declare-at-use` C++23 indeterminate-value model and two comment-elision validator warnings; descriptive summary mood shared with 67 previously verified cpp rules.
- INDEX header verified count and `categories.md` counts are outside verifier ownership and may be stale after this batch's 16 flips.
