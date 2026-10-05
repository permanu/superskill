# Verification Report — C++ Batch 2 (raii + type)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-04
**Scope:** 25 draft rules — 13 `catalog/rules/cpp/raii-*.md`, 12 `catalog/rules/cpp/type-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0

## Method

1. Fetched every cited URL (all HTTP 200; 13 new cppreference pages plus the C++ Core Guidelines
   already cached from batch 1) and grepped each for the specific claim.
2. Compiled all 50 snippets with `clang++ -fsyntax-only -std=c++23 -Wall`.
3. Checked idiom, duplicates/near-duplicates, and cross-rule contradictions.
4. Re-checked frontmatter, section order, fences, summary/snippet limits, links, related ids,
   trigger fields, and contract anti-slop rules mechanically.
5. Confirmed `clang:-Woverloaded-virtual` in the Clang diagnostics reference and by compiling the
   `type-override` Bad snippet.

## Compile results

- 49/50 snippets: clean exit 0.
- `type-override` Bad: exit 0 with the documented warning
  `'Circle::area' hides overloaded virtual function [-Woverloaded-virtual]` — the rule's `tool`
  id and comment match; accepted per instructions.

## Rejections (3)

| rule id | reason | evidence |
|---|---|---|
| cpp-raii-make-unique | The Why/Bad claim a leak that cannot occur on the baseline; the cited source itself scopes it to pre-C++17. | CG R.23: "It also ensures exception safety in complex expressions **(in pre-C++17 code)**"; its example marks `unique_ptr<Foo> p {new Foo{7}}; // OK: but repetitive`. cppreference *Order of evaluation* rule 14: since C++17 "the initialization of every parameter [is] indeterminately sequenced with respect to ... any other parameter" (no interleaving), so in the Bad snippet a throwing sibling argument cannot strand the first `unique_ptr`'s allocation. |
| cpp-raii-wrap-resources | `// ... work ...` elision appears in both fences; CONTRACT §12 forbids `...` used as an elision (and §4 requires complete snippets). Rest of the rule passes. | `raii-wrap-resources.md` lines 38 and 54. |
| cpp-type-class-invariant | Good constructor carries only `// validate here; throw std::invalid_argument ...` instead of a check, so the Bad's invalid value still constructs in the Good; placeholder violates §0.4/§4 and the rule's own Why ("A constructor establishes the invariant once"). | `type-class-invariant.md` lines 45-47; `Date{2026, 13, 0}` (line 35) remains constructible under the Good. |

## Source verification (evidence quotes)

- **CG R.1** — "Manage resources automatically using resource handles and RAII ... acquire the
  resource in its constructor, and release it in its destructor."
- **CG CP.20 / CP.21** — "Use RAII, never plain `lock()`/`unlock()`"; "Use `std::lock()` or
  `std::scoped_lock` to acquire multiple mutexes ... To avoid deadlocks."
- **cppreference `lock_guard`** — "mutex wrapper that provides a convenient RAII-style mechanism
  for owning a mutex for the duration of a scoped block ... the mutex is released."
- **CG F.20** — "For 'out' output values, prefer return values to output parameters."
- **CG F.7** — "Passing a smart pointer transfers or shares ownership and should only be used when
  ownership semantics are intended. A function that does not manipulate lifetime should take raw
  pointers or references instead." (R.30 defers to F.7; R.34 shared-ownership quote confirmed.)
- **CG R.21** — "Prefer unique_ptr over shared_ptr unless you need to share ownership."
- **cppreference `shared_ptr`** — "retains shared ownership of an object through a pointer."
- **CG R.24** — "Use std::weak_ptr to break cycles of shared_ptrs."
- **cppreference `weak_ptr`** — "holds a non-owning ('weak') reference to an object that is
  managed by std::shared_ptr."
- **CG R.11** — "Avoid calling new and delete explicitly ... Warn on any explicit use of new and
  delete. Suggest using make_unique instead."
- **CG R.3 / R.4** — "A raw pointer (a T*) is non-owning"; "A raw reference (a T&) is non-owning."
- **CG E.19** — "Use a final_action object to express cleanup if no suitable resource handle is
  available"; **cppreference RAII** — "binds the life cycle of a resource ... the constructor
  acquires ... the destructor releases."
- **CG C.64** — "A move operation should move and leave its source in a valid state"; cppreference
  move constructor — "leave the argument in some valid but otherwise indeterminate state."
- **CG C.20** — "If you can avoid defining default operations, do"; cppreference rule of zero.
- **CG C.21** — "If you define or =delete any copy, move, or destructor function, define or
  =delete them all"; cppreference rule of five ("has to declare all five special member
  functions").
- **CG ES.46** — "Avoid lossy (narrowing, truncating) arithmetic conversions."
- **CG SL.str.2** — "Use std::string_view or gsl::span<char> to refer to character sequences";
  cppreference `basic_string_view` — "describes an object that can refer to a constant contiguous
  sequence of CharT."
- **CG P.7** — "Don't pass structured data as strings ... The date is validated twice (by the Date
  constructor) and passed as a character string (unstructured data)"; enforcement: "Look for
  unchecked values coming from input."
- **CG C.46** — "By default, declare single-argument constructors explicit."
- **CG C.164** — "Avoid implicit conversion operators"; cppreference explicit specifier.
- **CG C.10 / C.11 / C.120** — "Prefer concrete types over class hierarchies"; "Make concrete
  types regular"; hierarchies "only" for inherent hierarchical structure; cppreference `variant`
  — "type-safe union."
- **CG C.128** — "Virtual functions should specify exactly one of virtual, override, or final."
- **CG Enum.3** — "Prefer class enums over 'plain' enums."
- **CG C.181** — "Avoid 'naked' unions ... The C++17 `variant` type (found in `<variant>`) does
  that for you."
- **CG I.4** — "Make interfaces precisely and strongly typed."
- **CG F.24 / R.14** — "Use a span<T> ... to designate a half-open sequence"; "Avoid [] parameters,
  prefer span"; cppreference `span` — "refer to a contiguous sequence of objects."

## Tool ids

- `clang:-Woverloaded-virtual` — real diagnostic ("warning: A hides overloaded virtual
  function"), fires on the `type-override` Bad snippet; documented in the rule. No other tool
  ids in this batch.

## Duplicates / consistency

- Mechanical checks pass for all 25: frontmatter fields, section order, one Bad + one Good,
  summary ≤ 30 words, snippets ≤ 25 lines, links and `related` ids resolve, ids globally unique,
  no hedge words (only `wrap-resources` fails on the `...` elision above).
- Closest pairs reviewed and judged distinct decisions, not near-duplicates: `wrap-resources`
  (all resources) vs `lock-guard` (mutex discipline, adds scoped_lock deadlock avoidance);
  `no-naked-new` (allocation statements, CG R.11) vs `raw-non-owning` (pointer/reference type
  semantics, CG R.3/R.4) — shared exemplar only; `unique-default` (owner-type choice, R.21) vs
  `param-ownership` (parameter lifetime roles, F.7/R.30); `rule-of-zero` (avoid special members)
  vs `rule-of-five` (when they are unavoidable). No contradictions.
- Minor notes (not rejection grounds): `raii-scope-guard` lists `std::exchange` in
  `triggers.symbols` although the Good uses a saved `bool` — defensible as the save/replace API;
  `type-string-view` Bad says a literal "allocates" a temporary `std::string` (short literals may
  use SSO; the construction/copy point still holds).
- Cross-batch observations for the batch-3 verifier: `api-adjacent-params` covers the same
  swapped-int-parameters example as `type-strong-types` (general vs parameter-position rule);
  `conc-scoped-lock-multiple` overlaps `raii-lock-guard`'s scoped_lock clause;
  `raii-return-by-value` vs `api-return-struct` are distinct (single handle vs multiple values).

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-raii-lock-guard | verified | cppref lock_guard RAII quote; CG CP.20/CP.21; both rc=0 |
| cpp-raii-make-unique | rejected | CG R.23 scopes exception safety to "pre-C++17 code"; cppref eval_order rule 14; Bad's leak impossible on baseline |
| cpp-raii-return-by-value | verified | CG F.20; cppref unique_ptr owns/disposes; both rc=0 |
| cpp-raii-param-ownership | verified | CG F.7 "only ... when ownership semantics are intended"; R.34; both rc=0 |
| cpp-raii-unique-default | verified | CG R.21; cppref shared_ptr "retains shared ownership"; both rc=0 |
| cpp-raii-weak-break-cycles | verified | CG R.24; cppref weak_ptr "non-owning ('weak') reference"; both rc=0 |
| cpp-raii-no-naked-new | verified | CG R.11 "Avoid calling new and delete explicitly"; cppref unique_ptr; both rc=0 |
| cpp-raii-raw-non-owning | verified | CG R.3/R.4 "raw pointer (a T*) is non-owning"; both rc=0 |
| cpp-raii-scope-guard | verified | CG E.19 final_action; cppref RAII lifecycle binding; both rc=0 |
| cpp-raii-move-valid-source | verified | CG C.64 valid-state quote; cppref move ctor "valid but otherwise indeterminate state"; both rc=0 |
| cpp-raii-rule-of-zero | verified | CG C.20; cppref rule of zero; both rc=0 |
| cpp-raii-wrap-resources | rejected | `// ... work ...` elision in both fences (lines 38, 54) violates CONTRACT §12; rest passes |
| cpp-raii-rule-of-five | verified | CG C.21; cppref rule of five; both rc=0 |
| cpp-type-class-invariant | rejected | Good ctor is a validation comment only (lines 45-47); Bad's `Date{2026,13,0}` still constructs; placeholder |
| cpp-type-no-narrowing | verified | CG ES.46; both rc=0 |
| cpp-type-string-view | verified | CG SL.str.2; cppref basic_string_view contiguous-reference quote; both rc=0 |
| cpp-type-parse-at-boundary | verified | CG P.7 "Don't pass structured data as strings"/"unchecked values coming from input"; both rc=0 |
| cpp-type-explicit-ctor | verified | CG C.46; cppref explicit; both rc=0 |
| cpp-type-no-implicit-conversion-op | verified | CG C.164; cppref explicit; both rc=0 |
| cpp-type-regular-value-types | verified | CG C.10/C.11/C.120; cppref variant "type-safe union"; both rc=0 |
| cpp-type-override | verified | CG C.128; `-Woverloaded-virtual` fires on Bad as documented; good rc=0 |
| cpp-type-enum-class | verified | CG Enum.3; cppref enum; both rc=0 |
| cpp-type-variant-over-union | verified | CG C.181 "variant type ... does that for you"; cppref variant; both rc=0 |
| cpp-type-strong-types | verified | CG I.4 "precisely and strongly typed"; both rc=0 |
| cpp-type-span | verified | CG F.24/R.14; cppref span contiguous-sequence quote; both rc=0 |

**Counts: verified 22/25, rejected 3** (cpp-raii-make-unique, cpp-raii-wrap-resources,
cpp-type-class-invariant — left `draft`).
**Follow-up:** `INDEX.md` verified count must move 16 → 38 by the owning agent (verifier is not
permitted to edit it).

## Addendum — re-verification of the 3 rejected rules (2026-10-05)

All 6 revised snippets recompiled with the same toolchain (`clang++ -fsyntax-only -std=c++23
-Wall`): 6/6 exit 0. New citation `cppreference - std::make_unique` fetched, HTTP 200, supports
the claim ("Constructs an object of type T and wraps it in a std::unique_ptr"; "If an exception
is thrown, this function has no effect").

| rule id | verdict | evidence |
|---|---|---|
| cpp-raii-make-unique | rejected | Claim and leak now correct, but the Why writes "pre-C++17" and "since C++17" — two version numbers, violating CONTRACT §8 "Do not write version numbers anywhere in rules or indexes". Rephrase baseline-relative (e.g. "applies only to code predating the current baseline") and it passes; everything else checks out. |
| cpp-raii-wrap-resources | verified | `// ... work ...` replaced with `total += value;` in both fences; no `...` remains; both snippets rc=0; mechanical contract checks OK. |
| cpp-type-class-invariant | verified | Good constructor now checks `month 1-12` / `day 1-31` and throws `std::invalid_argument`; the Bad's `Date{2026, 13, 0}` now throws under the Good; both snippets rc=0; `#include <stdexcept>` present. |

`raii-make-unique` re-verification details (everything except §8 now passes): CG R.23's "in
pre-C++17 code" scoping plus cppreference *Order of evaluation* rule 14 (parameters indeterminately
sequenced) confirm the rewritten rationale; the new Bad genuinely leaks (`configure()` may throw
between `new` and the `unique_ptr` wrap — CG R.12: "an exception or a return might lead to a
leak"); Good wraps first so the throw is safe; summary/title/triggers/links unchanged and
consistent.

**Batch-2 totals after addendum: verified 24/25, rejected 1.** `INDEX.md` verified count should
now be 40 (16 + 24).

**Follow-up re-verification (2026-10-05):** `cpp-raii-make-unique` rephrased with no version
numbers — no `C++NN`/`since C++`/`pre-C` tokens remain, mechanical contract check OK, both
snippets rc=0, rationale still matches CG R.23 / cppreference eval_order rule 14 and the remaining
raw-owner window matches CG R.12 — flipped to `verified`; batch-2 totals now **verified 25/25,
rejected 0**, `INDEX.md` verified count 41 (16 + 25).
