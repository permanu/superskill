# Verification Report — C++ Batch 11 (unsafe + ptr)

**Verifier:** adversarial subagent (separate context; did not author these rules)
**Date:** 2026-10-05
**Scope:** 22 draft rules — 12 `catalog/rules/cpp/unsafe-*.md`, 10 `catalog/rules/cpp/ptr-*.md`
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), arm64-apple-darwin25.6.0; `-std=c++23 -Wall`; ASan+UBSan runs with 10 s timeouts
**Pre-state:** all 22 files `status: draft`

## Method

1. Read `docs/authoring/CONTRACT.md` and `docs/authoring/prompts/verify-batch.md`; applied all four checks per rule.
2. Fetched all 16 distinct cited URLs (cppreference UB, eval_order, default_initialization, lifetime, dynamic_cast, memcpy, operator_arithmetic, goto, nullptr, enable_shared_from_this, use_count, addressof, shared_ptr, weak_ptr, unique_ptr; Core Guidelines) — all HTTP 200 — and confirmed each claim against the page text.
3. Extracted all 44 fenced snippets and compiled each independently with `clang++ -fsyntax-only -std=c++23 -Wall`.
4. Ran all 44 snippets under `-fsanitize=address,undefined -fno-sanitize-recover=all` (plus targeted probes: `alloc_dealloc_mismatch=1`, `leaks --atExit`, `-O0 detect_stack_use_after_return=1`) with timeouts; rule snippets unmodified.
5. Mechanical checks: frontmatter fields, id/path match, baseline literal, section order, one `cpp` fence per Bad/Good, summary ≤ 30 words and hedge-free, snippets ≤ 25 lines, `related` IDs and See Also links resolve, INDEX entries, no TODO/elisions/Unicode ellipsis, no linter claims; duplicate review within the batch and against the rest of the pack.
6. Re-ran the deterministic validator: `node dist/rules/cli.js validate --lang cpp --json` — the only error in the whole cpp pack is `ptr-nullptr` (see Blockers).

## Source verification (evidence quotes)

- **UB page** — null dereference example verbatim: `int* p = nullptr; return *p; // Unconditional UB` compiled as `bar(): ret`; out-of-bounds example `for (int i = 0; i <= 4; i++) if (table[i] == v)` compiled as `mov eax, 1; ret`; uninitialized `std::size_t a; if (x) a = 42; return a;` compiled as `mov eax, 42; ret`; unsequenced multiple modifications listed; "the compiled program is not required to do anything meaningful". (`unsafe-no-deref-invalid`, `unsafe-out-of-bounds`, `unsafe-uninitialized-read`, `unsafe-unsequenced`)
- **Order of evaluation** — "A side effect on a memory location is unsequenced relative to another side effect on the same memory location: … `i = ++i + i++; // undefined behavior`"; "…relative to a value computation…: … `n = ++i + i; // undefined behavior`"; `i = i++ + 2; // undefined behavior until C++17`; evaluations are "indeterminately sequenced". (`unsafe-unsequenced`)
- **Default-initialization** — "retains an indeterminate value until that value is replaced"; "Every other use of an indeterminate value is undefined behavior"; examples `int e = d;` and `return b ? d : 0;`. (`unsafe-uninitialized-read`)
- **Lifetime** — ends when "the storage which the object occupies is released, or is reused by an object that is not nested within it"; "Access outside of lifetime" lists lvalue-to-rvalue conversion, member access/member calls, `dynamic_cast`, `typeid`; Storage reuse example verbatim: `new (&x) S(x.m); // undefined behavior: the storage is reused`. (`unsafe-use-after-lifetime`, `unsafe-return-local-address`, `unsafe-placement-new`)
- **dynamic_cast** — failed pointer cast → null pointer value; failed reference cast → `std::bad_cast`; Notes: `static_cast` downcast "is only safe if the program can guarantee (through some other logic) that the object pointed to by expression is definitely `Derived`". (`unsafe-invalid-downcast`)
- **memcpy** — "the behavior is undefined: dest or src is a null pointer or invalid pointer. Copying takes place between objects that overlap." (`unsafe-memcpy-overlap`)
- **Arithmetic operators** — shift: "If the value of rhs is negative or is not less than the number of bits in lhs, the behavior is undefined"; pointer add/sub: array result within `[0, n]`, "Other j values result in undefined behavior", and subtraction "Otherwise, the behavior is undefined". (`unsafe-shift-range`, `unsafe-out-of-bounds`, `unsafe-pointer-compare`)
- **goto** — entering the scope of any automatic variable is ill-formed unless all are scalars without initializers or trivial classes without initializers; scope exit calls destructors "in the order opposite to the order of their construction". (`unsafe-goto`)
- **nullptr** — "denotes the pointer literal. It is a prvalue of type `std::nullptr_t`"; implicit conversions; example: `clone(nullptr)` fine, `clone(NULL)`/`clone(0)` "ERROR: non-literal zero cannot be a null pointer constant". (`ptr-nullptr`)
- **enable_shared_from_this** — "safe alternative to an expression like `std::shared_ptr<T>(this)`, which is likely to result in this being destroyed more than once by multiple owners that are unaware of each other"; `shared_from_this` without an owner throws `std::bad_weak_ptr`. (`ptr-enable-shared-from-this`)
- **shared_ptr::use_count** — "should be considered approximate"; "When use_count returns 1, it does not imply that the object is safe to modify … new shared owners may be introduced concurrently, such as by std::weak_ptr::lock"; "Only when use_count returns 0 is the count accurate". (`ptr-use-count-debug`)
- **addressof** — "Obtains the actual address of the object or function arg, even in presence of overloaded operator&"; "Rvalue overload is deleted". (`ptr-addressof`)
- **shared_ptr** — "A shared_ptr can share ownership of an object while storing a pointer to another object… member objects while owning the object they belong to. The stored pointer is the one accessed by get(), the dereference…"; Notes: "Constructing a new shared_ptr using the raw underlying pointer owned by another shared_ptr leads to undefined behavior"; object destroyed when "the last remaining shared_ptr owning the object is destroyed". (`ptr-aliasing-ctor`, `ptr-shared-aliased-dangling`)
- **weak_ptr** — "holds a non-owning ('weak') reference… must be converted to std::shared_ptr in order to access"; page example verbatim: `if (std::shared_ptr<int> spt = gw.lock())`. (`ptr-weak-lock`)
- **unique_ptr** — release "returns a pointer to the managed object and releases the ownership"; get "returns a pointer to the managed object"; "The default deleter (std::default_delete) uses the delete operator"; object disposed of "using a potentially user-supplied deleter". (`ptr-release-handoff`, `ptr-get-observe`, `ptr-custom-deleter`)
- **Core Guidelines** — ES.47, ES.62 ("Don't compare pointers into different arrays… The result of doing so is undefined", example `&a1[5] < &a2[7]`), ES.65, ES.76, C.146, R.1, R.3, R.37 all quoted as the rules claim. (`unsafe-no-deref-invalid`, `unsafe-return-local-address`, `unsafe-pointer-compare`, `unsafe-invalid-downcast`, `unsafe-goto`, `ptr-custom-deleter`, `ptr-get-observe`, `ptr-release-handoff`, `ptr-shared-aliased-dangling`, `ptr-nullptr`)

## Compile results (`-fsyntax-only -std=c++23 -Wall`)

- **44/44 snippets exit 0.** The four intended Bad diagnostics appear exactly as documented: `-Wunsequenced` (`unsafe-unsequenced`), `-Wuninitialized` (`unsafe-uninitialized-read`), `-Wreturn-stack-address` (`unsafe-return-local-address`), `-Wshift-count-overflow` (`unsafe-shift-range`). No other warnings or errors.

## Behavior results (ASan/UBSan, 10 s timeouts; snippets unmodified)

- **unsafe-no-deref-invalid:** Bad → UBSan `load of null pointer of type 'int'`; Good rc=0.
- **unsafe-unsequenced:** Bad/Good both run (rc=2); no sanitizer instruments this; `-Wunsequenced` is the evidence.
- **unsafe-uninitialized-read:** Bad/Good run; no sanitizer instruments uninitialized reads on this toolchain; `-Wuninitialized` is the evidence.
- **unsafe-use-after-lifetime:** Bad → ASan `heap-use-after-free`; Good rc=1 under ASan.
- **unsafe-return-local-address:** Bad → ASan `stack-use-after-return` at `-O0` with `detect_stack_use_after_return=1`; Good rc=0.
- **unsafe-invalid-downcast:** Bad → UBSan `downcast … with insufficient space for an object of type 'Derived'`; Good rc=0.
- **unsafe-memcpy-overlap:** Bad/Good both rc=0 at `-O0` (no sanitizer instruments overlap); contract quote is the evidence.
- **unsafe-placement-new:** Bad/Good rc=0 (lifetime rules not instrumented); the cppreference example is verbatim.
- **unsafe-out-of-bounds:** Bad → UBSan `index 4 out of bounds for type 'int[4]'`; Good rc=0.
- **unsafe-shift-range:** Bad → UBSan `shift exponent 32 is too large for 32-bit type 'int'`; Good rc=16.
- **unsafe-pointer-compare:** Bad/Good rc=0; ordering of unrelated pointers is unspecified and uninstrumented; ES.62 is the evidence.
- **unsafe-goto:** Bad and Good both rc=12 (same result, flag replaces the jump).
- **ptr-nullptr:** Bad/Good rc=0 (rejected on validator/formatting, not behavior).
- **ptr-enable-shared-from-this:** Bad → ASan `bad-free` (second control block); Good rc=0, `use_count()==2`.
- **ptr-use-count-debug:** Bad/Good rc=1 (value); page text is the evidence.
- **ptr-addressof:** Bad rc=1 (overloaded `operator&` returns null), Good rc=0 (`std::addressof`).
- **ptr-aliasing-ctor:** Bad → ASan `bad-free` (member freed by a second control block); Good rc=1.
- **ptr-custom-deleter:** Bad → ASan `alloc-dealloc-mismatch (malloc vs operator delete)` with `alloc_dealloc_mismatch=1`; Good clean.
- **ptr-get-observe:** Bad → ASan `double-free`; Good rc=1.
- **ptr-release-handoff:** `leaks --atExit`: Bad 1 leak / 16 bytes; Good 0 leaks.
- **ptr-shared-aliased-dangling:** Bad → ASan `heap-use-after-free`; Good rc=1.
- **ptr-weak-lock:** Bad → UBSan `reference binding to null pointer of type 'element_type'`; Good rc=0.

## Duplicates / formatting / links

- No duplicate IDs or near-duplicate pairs within the 22 or against the rest of the pack (token-Jaccard over summaries and snippet code, thresholds 0.45/0.5; manual review of the obvious families: no-deref vs use-after-lifetime vs return-local-address; aliasing-ctor vs shared-aliased-dangling; get-observe vs release-handoff; unsequenced vs uninitialized-read). Cross-language packs state their own versions, no conflict.
- Exactly one `cpp` Bad and one `cpp` Good per rule; all snippets ≤ 25 lines (max 16); summaries ≤ 30 words, hedge-free; no TODO/FIXME/XXX/TBD, no bare `...` lines, no Unicode ellipsis; all `related` IDs resolve; all See Also files exist; INDEX lists all 22 and prefix targets (unsafe 12, ptr 10) are met. All rules `enforce: review`; no linter-enforcement claims.
- **One formatting failure:** `ptr-nullptr` — `keywords: [nullptr, null, pointer-literal]`; the bare `null` parses as a YAML null value (CONTRACT §12 unquoted YAML type trap) and the deterministic validator errors with `"triggers.keywords" must be an array of non-empty strings`. Left `draft`.

## Verdicts

| rule id | verdict | evidence | notes |
|---|---|---|---|
| cpp-unsafe-no-deref-invalid | verified | ES.65; UB page `return *p` → `bar(): ret`; UBSan null load | — |
| cpp-unsafe-unsequenced | verified | eval_order `i = ++i + i++;` / `n = ++i + i;` UB quotes; `-Wunsequenced` | — |
| cpp-unsafe-uninitialized-read | verified | default_init indeterminate-value + "every other use … undefined" quotes; `-Wuninitialized` | page marks a C++26 erroneous-behavior transition; harness baseline is C++23 |
| cpp-unsafe-use-after-lifetime | verified | lifetime ends on release/reuse + Access-outside list; ASan heap-use-after-free | — |
| cpp-unsafe-return-local-address | verified | ES.65; lifetime scope-exit; `-Wreturn-stack-address`; ASan stack-use-after-return | — |
| cpp-unsafe-invalid-downcast | verified | C.146; failed cast → null/bad_cast; Notes "only safe if the program can guarantee"; UBSan downcast | — |
| cpp-unsafe-memcpy-overlap | verified | memcpy contract: null/invalid or overlapping → UB | Why's UB-page sentence is a gloss (page does not name memcpy); memcpy page carries the claim |
| cpp-unsafe-placement-new | verified | lifetime Storage-reuse example `new (&x) S(x.m)` verbatim | not sanitizer-instrumented; source example is exact |
| cpp-unsafe-out-of-bounds | verified | UB page `i <= 4`/`table[4]` optimizer example; pointer [0,n] rule; UBSan index OOB | — |
| cpp-unsafe-shift-range | verified | arithmetic rhs negative-or-≥ width → UB; `-Wshift-count-overflow`; UBSan shift exponent | same UB-page gloss as memcpy rule |
| cpp-unsafe-pointer-compare | verified | ES.62 undefined + example; arithmetic cross-object subtraction UB | relational ordering is unspecified (not UB) and uninstrumented; wording "no defined result" matches CG |
| cpp-unsafe-goto | verified | ES.76 "Avoid goto"/"Flag goto"; goto scope/destructor rules; both snippets rc=12 | ES.76 carves out nested-loop forward jumps — the Bad example is that tolerated exception; stricter taste position is acceptable at `prefer` |
| cpp-ptr-nullptr | **rejected** | validator error `"triggers.keywords" must be an array of non-empty strings`; bare `null` is a YAML null (CONTRACT §12) | fix: quote `"null"` or use `null-pointer`, then re-verify; snippets and sources otherwise pass |
| cpp-ptr-enable-shared-from-this | verified | ESFT safe-alternative + bad_weak_ptr quotes; ASan bad-free; Good `use_count()==2` | — |
| cpp-ptr-use-count-debug | verified | use_count approximate / "1 does not imply safe" / "only 0 accurate" quotes | — |
| cpp-ptr-addressof | verified | actual-address + deleted rvalue overload quotes; Bad rc=1 vs Good rc=0 | — |
| cpp-ptr-aliasing-ctor | verified | shared_ptr aliasing + raw-pointer-UB Notes quotes; ASan bad-free | — |
| cpp-ptr-custom-deleter | verified | unique_ptr default_delete "uses the delete operator"; R.1; ASan alloc-dealloc-mismatch | — |
| cpp-ptr-get-observe | verified | unique_ptr get/dispose quotes; R.3; ASan double-free | — |
| cpp-ptr-release-handoff | verified | unique_ptr release quote; R.3; `leaks`: Bad 1 leak/16 B, Good 0 | — |
| cpp-ptr-shared-aliased-dangling | verified | shared_ptr last-owner destruction; R.37; ASan heap-use-after-free | — |
| cpp-ptr-weak-lock | verified | weak_ptr non-owning + `if (std::shared_ptr<int> spt = gw.lock())` example; UBSan null binding | — |

**Counts: verified 21/22, rejected 1.** The 21 passing rules were flipped `status: draft` → `status: verified`; `ptr-nullptr` remains `draft`. No other edits; batch 9/10 drafts untouched.

## Blockers / follow-ups

- **`cpp-ptr-nullptr` rejected.** The keywords array contains a bare `null`, which YAML parses as a null value; the deterministic validator errors and CONTRACT §12 lists unquoted `null` as an anti-slop trap. One-line fix (`"null"` or `null-pointer`) and re-verify; nothing else in the rule fails (snippets compile and run, sources confirmed).
- Non-blocking notes (kept as-is): `unsafe-goto` Bad example is ES.76's tolerated nested-loop exception; `unsafe-memcpy-overlap`/`unsafe-shift-range` Why sentences gloss the UB page's examples list; `unsafe-uninitialized-read` reflects the pre-C++26 indeterminate-value model (compile baseline is C++23).
- INDEX header verified count (232) and `categories.md` Batch 11 line are stale after these 21 flips (→ 253); both are outside verifier ownership.

**Addendum (2026-10-05):** `cpp-ptr-nullptr` fix re-verified — keywords now parse as `["nullptr","null","pointer-literal"]` (all strings), `validate --lang cpp` reports 0 errors and 0 batch warnings, both snippets compile clean with `-fsyntax-only -std=c++23 -Wall` and run clean under ASan/UBSan; flipped to `verified` — final batch count **verified 22/22, rejected 0**.
