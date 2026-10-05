# Verification Report — C++ Batch 3 (api + conc)

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-04
**Scope:** 26 draft rules — 13 `catalog/rules/cpp/api-*.md`, 13 `catalog/rules/cpp/conc-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied the five
   checks per rule.
2. Fetched all 12 cited URLs (11 cppreference pages + the C++ Core Guidelines; all HTTP 200),
   extracted text, and grepped each for the specific claim; read the CG guideline bodies for
   I.2–I.27, F.16/F.21/F.51, C.35, CP.4–CP.100.
3. Extracted all 52 fenced snippets and compiled each with
   `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Mechanically re-checked frontmatter fields, id/path match, section order, exactly one Bad and
   one Good fence with `cpp` tag, summary ≤ 30 words, snippets ≤ 25 lines, trigger fields,
   `related` ids, `See Also` links, hedge words, version strings, TODO/elisions.
5. Confirmed both `clang:` tool ids in Clang's DiagnosticsReference and by compiling the Bad
   snippets, with flag-acceptance and suppression controls.
6. Duplicate review within the pack and against the rest of `catalog/rules/cpp/`, including the
   two cross-batch overlaps flagged by the batch-2 verifier.

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- 50/52 snippets: exit 0, no diagnostics.
- `api-virtual-dtor` Bad: exit 0 with the documented group variants
  `-Wdelete-non-abstract-non-virtual-dtor` ("delete called on non-final 'Derived' that has virtual
  functions but non-virtual destructor") and `-Wdelete-abstract-non-virtual-dtor` ("delete called on
  'Base' that is abstract but has non-virtual destructor"); Good clean. Accepted per instructions.
- `conc-name-locks` Bad: exit 0 with `-Wunused-value` ("ignoring temporary created by a constructor
  declared with 'nodiscard' attribute") from libc++'s nodiscard `lock_guard` constructor — the
  diagnostic directly supports the rule's claim that the unnamed temporary is ignored; Good clean.
  Documented, accepted.
- `api-nodiscard`: Bad clean (no annotation, no warning — as intended); a variant of the Good that
  discards `save(...)` triggers
  `-Wunused-result: ignoring return value of function declared with 'nodiscard' attribute:
  check the failure before continuing`, confirming the tool claim.

## Source verification (evidence quotes)

- **CG I.2** — "Non-const global variables hide dependencies and make the dependencies subject to
  unpredictable changes." (`api-avoid-globals`)
- **CG I.3** — "Singletons are basically complicated global objects in disguise."
  (`api-avoid-singletons`)
- **CG I.5 / I.6** — "State preconditions (if any)"; "Some preconditions can be expressed as
  assertions"; I.6 lists `assert()` among the ways preconditions can be stated (it prefers
  `Expects()`; `assert` is the standard-library-only mechanism). (`api-preconditions`)
- **CG I.23** — "Keep the number of function arguments low"; "Having many arguments opens
  opportunities for confusion." (`api-few-arguments`)
- **CG I.24** — "Adjacent arguments of the same type are easily swapped by mistake."; alternative
  "Define a struct as the parameter type and name the fields". (`api-adjacent-params`)
- **CG I.25** — "Abstract classes that are empty (have no non-static member data) are more likely to
  be stable than base classes with state." (`api-abstract-interface`)
- **CG I.26** — "Different compilers implement different binary layouts for classes, exception
  handling, function names, and other implementation details." (`api-c-abi-subset`)
- **CG I.27** — "private data members participate in class layout ... changes to those implementation
  details require recompilation of all users"; the CG example mirrors the rule's Good (forward-
  declared impl, `unique_ptr`, declared dtor/move ops). (`api-pimpl`)
- **CG F.16** — "pass cheaply-copied types by value and others by reference to const";
  "`void f4(const int& x); // bad: overhead on access in f4()`". (`api-param-passing`)
- **CG F.21** — "To return multiple 'out' values, prefer returning a struct"; BAD output-only
  parameter example; structured bindings at the call site. (`api-return-struct`)
- **CG F.51** — "Where there is a choice, prefer default arguments over overloading"; "There is no
  guarantee that a set of overloaded functions all implement the same semantics."
  (`api-default-args`)
- **CG C.35** — "If the destructor is public, then calling code can attempt to destroy a derived
  class object through a base class pointer, and the result is undefined if the base class's
  destructor is non-virtual."; bad example nearly identical to the rule's Bad. (`api-virtual-dtor`)
- **CG E.25** — "consider adding a `[[nodiscard]]`" so callers test the result. (`api-nodiscard`)
- **CG CP.4** — "Think in terms of tasks, rather than threads"; example marks `std::thread`
  "less expressive and more error-prone" vs `std::async`. (`conc-tasks-not-threads`)
- **CG CP.8** — "volatile does not provide atomicity, does not synchronize between threads, and does
  not prevent instruction reordering"; "Use atomic types where you might have used volatile".
  (`conc-atomic-not-volatile`)
- **CG CP.21** — "Use `std::lock()` or `std::scoped_lock` to acquire multiple mutexes"; the scoped
  lock example: "order no longer matters." (`conc-scoped-lock-multiple`)
- **CG CP.22** — "Never call unknown code while holding a lock (e.g., a callback)"; deadlock/
  reentrancy example. (`conc-no-callback-under-lock`)
- **CG CP.25** — "A joining_thread is a thread that joins at the end of its scope"; enforcement:
  "Suggest use of gsl::joining_thread or C++20 std::jthread." (`conc-jthread-over-thread`)
- **CG CP.26** — "Don't detach() a thread"; "it is harder ... to ensure that the thread completed as
  expected". (`conc-no-detach`)
- **CG CP.31** — "Pass small amounts of data between threads by value, rather than by reference or
  pointer"; "Copying naturally gives unique ownership ... eliminates the possibility of data
  races." (`conc-pass-by-value`)
- **CG CP.42** — "Don't wait without a condition"; "A wait without a condition can miss a wakeup";
  example uses the predicated wait. (`conc-wait-predicate`)
- **CG CP.44** — "An unnamed local object is a temporary that immediately goes out of scope."; the
  bad example matches the rule's Bad. (`conc-name-locks`)
- **CG CP.50** — "Define a mutex together with the data it guards"; "It should be obvious to a reader
  that the data is to be guarded." (`conc-mutex-with-data`)
- **CG CP.100** — "Don't use lock-free programming unless you absolutely have to"; "error-prone and
  requires expert level knowledge"; exception: atomics are safe with the default seq_cst model.
  (`conc-lockfree-last-resort`, `conc-default-memory-order`)
- **cppreference `nodiscard`** — on a discarded-value expression "the compiler is encouraged to
  issue a warning"; string-literal reason "could be used to explain the rationale".
  (`api-nodiscard`)
- **cppreference `PImpl`** — "used to construct C++ library interfaces with stable ABI and to reduce
  compile-time dependencies"; "any change to those implementation details requires recompilation of
  all users"; "special member functions must be user-declared and defined out-of-line".
  (`api-pimpl`)
- **cppreference `std::tuple`** — "fixed-size collection of heterogeneous values"; structured
  binding example. (`api-return-struct`)
- **cppreference `std::atomic`** — documents `fetch_add` / `compare_exchange_weak` and atomic
  read-modify-write arithmetic. (`conc-lockfree-last-resort`, `conc-atomic-not-volatile`)
- **cppreference `std::jthread`** — "jthread automatically rejoins on destruction, and can be
  cancelled/stopped in certain situations"; holds a `std::stop_source`; constructor passes a
  `std::stop_token`. (`conc-jthread-over-thread`, `conc-no-detach`, `conc-stop-token`)
- **cppreference `std::condition_variable`** — wait can return on "a spurious wakeup"; "Use the
  predicated overload of wait ... which performs the same three steps". (`conc-wait-predicate`)
- **cppreference `std::memory_order`** — "The default behavior of all atomic operations in the
  library provides for sequentially consistent ordering"; relaxed operations "only guarantee
  atomicity"; release/acquire visibility rules. (`conc-default-memory-order`)
- **cppreference `std::stop_token`** — `stop_requested()`; the token can be passed to "the
  interruptible waiting functions of std::condition_variable_any". (`conc-stop-token`)
- **cppreference `std::lock_guard`** — destructor "unlocks the underlying mutex"; Notes: "A common
  beginner error is to 'forget' to give a lock_guard variable a name ... constructs a prvalue object
  that is immediately destroyed"; "std::scoped_lock offers an alternative ... deadlock avoidance
  algorithm". (`conc-name-locks`, `conc-scoped-lock-multiple`)

## Rejections (3)

Basis: check 1 requires each cited URL to support the rule's claim; the second source below supports
no claim in its rule (it resolves and is topically adjacent, but the rule never makes a claim about
its subject). All other checks pass for these rules; the fix is to drop or replace the citation,
after which they can be re-verified.

| rule id | reason | evidence |
|---|---|---|
| cpp-api-c-abi-subset | Cited source `basic_string_view` supports no claim: the rule never mentions views, and the page documents only the view type, lifetime responsibility, and TriviallyCopyable — no ABI/layout/FFI content. Claims are fully backed by CG I.26; both snippets rc=0. | `https://en.cppreference.com/w/cpp/string/basic_string_view` (HTTP 200): "describes an object that can refer to a constant contiguous sequence of CharT"; no ABI/layout sentence on page |
| cpp-api-virtual-dtor | Cited source `noexcept specifier` supports no claim: neither the rule nor its snippets mention noexcept; the page documents exception specifications and virtual-overrider rules. Claims are fully backed by CG C.35; Bad fires the declared `-Wdelete-non-virtual-dtor` group variants; Good rc=0. | `https://en.cppreference.com/w/cpp/language/noexcept_spec` (HTTP 200): destructors implicitly non-throwing, virtual overrider must be non-throwing; nothing about deleting through a non-virtual base |
| cpp-conc-tasks-not-threads | Cited source `std::jthread` supports no claim: the rule recommends `std::async`/futures and never mentions jthread; the page documents auto-join and stop-state. Claims are fully backed by CG CP.4 (which uses a `std::async` example); both snippets rc=0. | `https://en.cppreference.com/w/cpp/thread/jthread` (HTTP 200): "automatically rejoins on destruction"; no async/future/promise content |

## Tool ids

- `clang:-Wdelete-non-virtual-dtor` — DiagnosticsReference: "Some of the diagnostics controlled by
  this flag are enabled by default. Controls -Wdelete-abstract-non-virtual-dtor,
  -Wdelete-non-abstract-non-virtual-dtor." Accepted by the compiler with no unknown-warning
  diagnostic; fires on the `api-virtual-dtor` Bad (both variants); `-Wno-delete-non-virtual-dtor`
  suppresses them (0 warnings); a bogus variant warns
  `unknown warning option '-Wdelete-non-virtual-dtorX'; did you mean '-Wdelete-non-virtual-dtor'?`.
- `clang:-Wunused-result` — DiagnosticsReference: "This diagnostic is enabled by default";
  diagnostic text "warning: ignoring return value of function declared with A attribute". Fires on
  a discarded `[[nodiscard]]` result, backing the `api-nodiscard` claim.

## Duplicates / consistency

- All mechanical checks pass for all 26: frontmatter fields, id/path match, section order, one
  Bad + one Good fence, summary ≤ 30 words, snippets ≤ 25 lines, links and `related` ids resolve,
  no hedge words, no version strings, no TODO/FIXME.
- Requested cross-batch overlaps:
  - `cpp-api-adjacent-params` vs `cpp-type-strong-types` — **distinct decisions, not
    near-duplicates.** `type-strong-types` (CG I.4/I.5) wraps distinct *meanings*
    (`UserId`/`OrderId`); `api-adjacent-params` (CG I.24) disambiguates *positions* of same-typed
    parameters (`Left`/`Right`) and also offers the struct-grouping alternative; it explicitly
    cross-references `type-strong-types` as "the general strong-type rule". Shared swapped-int
    exemplar only.
  - `cpp-conc-scoped-lock-multiple` vs `cpp-raii-lock-guard` — **distinct decisions, not
    near-duplicates.** `raii-lock-guard` is CP.20 (RAII vs plain lock/unlock; Bad manual unlock,
    Good single `lock_guard`); `conc-scoped-lock-multiple` is CP.21 (multi-mutex deadlock
    avoidance; Bad nested `lock_guard`s, Good `scoped_lock(m1, m2)`). The overlap is one
    explanatory clause in `raii-lock-guard`'s Why; `conc-scoped-lock-multiple` cross-links it in
    See Also.
- Other close pairs judged distinct: `avoid-globals`/`avoid-singletons` (I.2 vs I.3),
  `few-arguments`/`adjacent-params` (I.23 vs I.24), `return-struct`/`few-arguments` (return vs
  input side), `c-abi-subset`/`pimpl` (I.26 vs I.27), `jthread-over-thread`/`no-detach`/`stop-token`
  (ownership vs lifetime vs cancellation), `atomic-not-volatile`/`default-memory-order`/
  `lockfree-last-resort` (primitive vs ordering vs algorithm), `name-locks`/`mutex-with-data`
  (naming vs pairing). No contradictions found.
- Minor notes (non-blocking): `conc-mutex-with-data` line 13 `// guards... something?` is the
  validator's comment-elision warning — rhetorical, not an omitted-code elision; the snippet is
  complete. `api-param-passing` Bad comment says a literal "allocates" a temporary string; short
  literals may use SSO (the construction/copy point stands; same note batch 2 accepted for
  `type-string-view`). `conc-default-memory-order` Good demonstrates a deliberate release store
  rather than the default — the body explains this is the sanctioned weakening; summary and body
  remain consistent.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-api-abstract-interface | verified | CG I.25 empty-abstract-stable quote; both rc=0 |
| cpp-api-adjacent-params | verified | CG I.24 swapped-adjacent quote; both rc=0; distinct from type-strong-types |
| cpp-api-avoid-globals | verified | CG I.2 hide-dependencies quote; both rc=0 |
| cpp-api-avoid-singletons | verified | CG I.3 disguise quote; both rc=0 |
| cpp-api-c-abi-subset | rejected | check 1: `basic_string_view` citation supports no claim (no ABI content); CG I.26 backs the rule; both rc=0 |
| cpp-api-default-args | verified | CG F.51 default-arguments quote; both rc=0 |
| cpp-api-few-arguments | verified | CG I.23 low-arguments quote; both rc=0 |
| cpp-api-nodiscard | verified | cppref nodiscard warning quote + CG E.25; `-Wunused-result` fires on discarded result; both rc=0 |
| cpp-api-param-passing | verified | CG F.16 value/const-ref quotes; both rc=0 |
| cpp-api-pimpl | verified | CG I.27 + cppref PImpl stable-ABI/recompilation quotes; both rc=0 |
| cpp-api-preconditions | verified | CG I.5/I.6 "State preconditions" + assertions quote; both rc=0 |
| cpp-api-return-struct | verified | CG F.21 prefer-struct quote; cppref tuple fixed-size quote; both rc=0 |
| cpp-api-virtual-dtor | rejected | check 1: `noexcept_spec` citation supports no claim (no noexcept in rule); CG C.35 backs; Bad fires documented `-Wdelete-non-virtual-dtor` variants; Good rc=0 |
| cpp-conc-atomic-not-volatile | verified | CG CP.8 volatile-no-synchronization quote; both rc=0 |
| cpp-conc-default-memory-order | verified | cppref memory_order seq_cst-default + relaxed-atomicity quotes; CP.100 exception; both rc=0 |
| cpp-conc-jthread-over-thread | verified | cppref jthread auto-rejoin quote; CG CP.25 enforcement suggests std::jthread; both rc=0 |
| cpp-conc-lockfree-last-resort | verified | CG CP.100 expert-knowledge quote; cppref atomic fetch_add/compare_exchange_weak; both rc=0 |
| cpp-conc-mutex-with-data | verified | CG CP.50 mutex-with-data quote; both rc=0 (validator comment warning noted) |
| cpp-conc-name-locks | verified | CG CP.44 unnamed-temporary quote; cppref lock_guard Notes; Bad rc=0 w/ documented `-Wunused-value` |
| cpp-conc-no-callback-under-lock | verified | CG CP.22 unknown-code quote; both rc=0 |
| cpp-conc-no-detach | verified | CG CP.26 don't-detach quote; cppref jthread auto-rejoin; both rc=0 |
| cpp-conc-pass-by-value | verified | CG CP.31 pass-small-by-value quote; both rc=0 |
| cpp-conc-scoped-lock-multiple | verified | CG CP.21 scoped_lock/order-no-longer-matters quote; cppref lock_guard scoped_lock note; both rc=0; distinct from raii-lock-guard |
| cpp-conc-stop-token | verified | cppref stop_token interruptible-waits + stop_requested; cppref jthread stop-state; both rc=0 |
| cpp-conc-tasks-not-threads | rejected | check 1: `std::jthread` citation supports no claim (rule is async/futures); CG CP.4 backs; both rc=0 |
| cpp-conc-wait-predicate | verified | CG CP.42 wait-with-condition quote; cppref condition_variable spurious-wakeup + predicated overload; both rc=0 |

**Counts: verified 23/26, rejected 3** (`cpp-api-c-abi-subset`, `cpp-api-virtual-dtor`,
`cpp-conc-tasks-not-threads` — left `draft`; reason: a cited source supports no claim; all other
checks pass).
**Follow-up:** `catalog/rules/cpp/INDEX.md` currently reads "Rules: 91 (verified: 38)"; the owning
agent must update the verified count to 61 after this batch (38 + 23). Verifier is not permitted
to edit it.

## Addendum — stray-citation fixes re-verified (2026-10-05)

The coordinator removed/replaced the three claimless citations. Re-checked all three (file bodies
and snippets confirmed byte-identical to the first pass; only the `sources` entries changed) and
flipped them to `verified`:

| rule id | fix applied | re-check evidence | verdict |
|---|---|---|---|
| cpp-api-c-abi-subset | `basic_string_view` citation removed; CG I.26 is the sole source | CG I.26 still backs every claim; both snippets rc=0 | verified |
| cpp-api-virtual-dtor | `noexcept_spec` citation removed; CG C.35 is the sole source | CG C.35 still backs every claim; Bad rc=0 with the documented `-Wdelete-non-virtual-dtor` group variants (`-Wdelete-abstract-non-virtual-dtor`, `-Wdelete-non-abstract-non-virtual-dtor`); Good rc=0 | verified |
| cpp-conc-tasks-not-threads | `std::jthread` replaced with cppreference `std::async` | fetched `https://en.cppreference.com/w/cpp/thread/async` (HTTP 200): "runs the function f asynchronously (potentially in a separate thread which might be a part of a thread pool) and returns a std::future"; "If the function f returns a value or throws an exception, it is stored in the shared state accessible through the std::future"; both snippets rc=0 | verified |

**Final counts: verified 26/26, rejected 0.**
**Updated follow-up:** batch 3 contributes 26 flips (38 verified before this batch → 64 including
it). `catalog/rules/cpp/INDEX.md` is concurrently maintained by other batch owners; at re-check
time it reads "Rules: 115 (verified: 63)" while the directory shows 91 verified of 114 rule files
(other batches are still landing) — the owning agent should reconcile once all batches stop.
