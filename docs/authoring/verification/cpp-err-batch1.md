# Verification Report — C++ err Batch 1

**Verifier:** adversarial (separate context; did not author these rules)
**Date:** 2026-10-04
**Scope:** 16 draft rules in `catalog/rules/cpp/err-*.md` (err prefix)
**Toolchain:** Apple clang 21.0.0 (clang-2100.3.34.2), target arm64-apple-darwin25.6.0

## Method

For every rule:

1. Fetched each cited source URL with `curl` (all returned HTTP 200; text extracted and grepped).
2. Extracted both fenced snippets and compiled each with
   `clang++ -fsyntax-only -std=c++23 -Wall` (32/32 snippets exit 0).
3. Checked idiom against current stable C++ (C++23 baseline) and cross-read `related` rules for
   duplication/contradiction.
4. Re-checked frontmatter fields, section order, one Bad + one Good fence, summary word count,
   snippet line count, hedge words, dead links, and duplicate ids mechanically.
5. Confirmed every `clang-tidy:` check id in the official clang-tidy docs, and `clang:-Wexceptions`
   in the Clang diagnostics reference.

No rule was rejected. Two Bad snippets produce a compiler warning by design, and both rules
document the behavior (details below).

## Compile results (all `-fsyntax-only -std=c++23 -Wall`)

- 30/32 snippets: clean, no diagnostics.
- `err-catch-order` Bad: exit 0, documented warning
  `exception of type 'const ProtocolError &' will be caught by earlier handler [-Wexceptions]`
  (rule sets `tool: clang:-Wexceptions` and comments "hides the handler below" / "never runs").
- `err-dtor-noexcept` Bad: exit 0, documented warning
  `'~Connection' has a non-throwing exception specification but can still throw [-Wexceptions]`
  (rule comments "std::terminate during unwind" and the Why explains it).

## Source verification (evidence quotes)

- **CG E.15** — "Throwing by value (not by pointer) and catching by reference prevents copying,
  especially slicing base subobjects"; "Flag throwing raw pointers."
- **CG E.16** — "Destructors, deallocation, swap, and exception type copy/move construction must
  never fail"; "The standard library assumes that destructors, deallocation functions ... and
  swap do not throw. If they do, basic standard-library invariants are broken"; "Also, make move
  operations noexcept."
- **CG E.25** — no exceptions: simulate RAII with a `valid()` member, "consider adding a
  `[[nodiscard]]`" so the caller tests the result.
- **CG E.26** — no exceptions, unrecoverable: "call `abort()`, `quick_exit()`, or a similar
  function".
- **CG E.27** — "Systematic use of any error-handling strategy minimizes the chance of forgetting
  to handle an error"; pair-of-values example.
- **CG E.28** — "Global state is hard to manage and it is easy to forget to check it"
  (errno-style handling).
- **CG E.31** — "Properly order your catch-clauses. Reason: catch-clauses are evaluated in the
  order they appear and one clause can hide another."
- **CG C.42** — "If a constructor cannot construct a valid object, throw an exception"; the bad
  `X3` example matches the rule's two-stage-`is_valid()` Bad pattern.
- **CG I.10 Alternative** — pair of values, "`if (error_code) { ... handle ... } // ... use val ...`".
- **isocpp FAQ** — "best to throw objects, not built-ins"; "avoid throwing pointer expressions,
  and avoid catching by pointer"; "If the 'use f' part of fct() throws an exception, the
  destructor is still invoked and the file is properly closed"; "How can I handle a destructor
  that fails? ... But do not throw an exception!"; constructor failure: "how do you report the
  error? You throw an exception"; translating "to another type and rethrowing".
- **cppreference `std::expected`** — and_then "returns the result of the given function on the
  expected value if it exists; otherwise, returns the expected itself" (transform analogous);
  "expected is never valueless".
- **cppreference compiler support** — `<expected>` (P0323R12) and monadic operations (P2505R5)
  implemented by current stable compilers.
- **cppreference `noexcept` spec** — "When an exception handler encounters the outermost block of
  a non-throwing function, the function `std::terminate` is called"; destructors implicitly
  noexcept by default.
- **cppreference `std::optional`** — "manages an optional contained value, i.e. a value that may
  or may not be present."
- **cppreference `std::error_code`** — "Each `std::error_code` object holds an error code value
  ... and a pointer to an object of type `std::error_category`"; `message()` "obtains the
  explanatory string".
- **cppreference `try` block** — exception "matched against the handlers in its handler-seq".
- **cppreference `throw_with_nested`** — the `nested_exception` base "calls
  `std::current_exception`, capturing the currently handled exception object ... in a
  `std::exception_ptr`."
- **libstdc++ manual** — "propagating exceptions should not be swallowed in gratuitous
  `catch(...)` blocks ... If a terminating `catch(...)` block exists then it should end with a
  `throw` to re-throw the current exception."; `-fno-exceptions` replaces throwing helpers with
  `abort()`; "Compatibility With C": "unwinding into a frame with no exception handling data will
  cause a runtime abort. If the unwinder runs out of unwind info before it finds a handler,
  `std::terminate()` is called."
- **WG21 P0323R12** — "`expected<T, E>` as a supplement to `optional<T>`, expressing why an
  expected value isn't contained in the object."; "The major advantage of `expected<T, E>` over
  `optional<T>` is the ability to transport an error."

## Tool ids

- `misc-throw-by-value-catch-by-reference` — exists: "Finds violations of the rule 'Throw by
  value, catch by reference'". (Used by catch-by-reference and throw-by-value; the two rules
  cover the catch side and the throw side respectively.)
- `bugprone-exception-escape` — exists; covers destructors, move ctors/assignment, `swap`, and
  "Functions marked with `throw()` or `noexcept`" (`CheckNothrowFunctions`, default true).
- `bugprone-empty-catch` — exists: "Detects and suggests addressing issues with empty catch
  statements"; "Empty catch statements ... are 'swallowing' exceptions."
- `clang:-Wexceptions` — exists, enabled by default; fires exactly on the `err-catch-order` Bad
  snippet (see compile results).

## Consistency and duplicates

- Frontmatter, section order, one Bad + one Good, summary ≤ 30 words, snippets ≤ 25 lines, no
  elisions (all `...` occurrences are `catch (...)`), no hedge words, all `See Also` links and
  `related` ids resolve, ids globally unique: all pass.
- No duplicate or near-duplicate pair within the pack. Closest pairs are intentionally split by
  decision: throw vs catch (`throw-by-value` / `catch-by-reference`), ordering vs swallowing
  (`catch-order` / `no-catch-all-swallow`), general `expected` vs no-exception error channel
  (`expected-for-recoverable` / `error-code-systematic`), destructors/move/swap vs general
  `noexcept` (`dtor-noexcept` / `noexcept-truthful`). No contradictions: no-exception rules each
  scope their advice to that regime.

## Notes / follow-ups

- `catalog/rules/cpp/INDEX.md` still reads "Rules: 16 (verified: 0)"; it must be updated to
  `verified: 16` by the owning agent (verifier is not permitted to edit it).
- The `err-degradation-path` Good snippet demonstrates the checked-`valid()` + `[[nodiscard]]`
  half of the rule; the fail-fast (`abort`) half is stated in title/Why and backed by CG E.26 but
  not shown in code. Accepted, not a rejection criterion.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| cpp-err-catch-by-reference | verified | CG E.15 slicing/quote; FAQ catch-by-reference; both rc=0; tool id exists |
| cpp-err-expected-monadic | verified | cppref and_then/transform short-circuit quotes; support tracker rows; both rc=0 |
| cpp-err-raii-not-catch | verified | FAQ destructor-on-unwind quote; CG E.6; both rc=0 |
| cpp-err-dtor-noexcept | verified | CG E.16 + FAQ "do not throw" + cppref implicit noexcept; Bad rc=0 w/ documented `-Wexceptions`; good rc=0; tool id exists |
| cpp-err-degradation-path | verified | CG E.25/E.26 quotes; libstdc++ `-fno-exceptions` abort; both rc=0 |
| cpp-err-throw-by-value | verified | CG E.15 throw-by-value + "Flag throwing raw pointers"; FAQ avoid pointer throws; both rc=0; tool id exists |
| cpp-err-error-code-systematic | verified | CG E.27 systematic-strategy quote; cppref error_code value+category; both rc=0 |
| cpp-err-optional-only-for-absence | verified | P0323R12 "supplement to optional" quote; cppref optional presence-only; both rc=0 |
| cpp-err-expected-for-recoverable | verified | P0323R12 discriminated-union/transport-error quotes; cppref expected; both rc=0 |
| cpp-err-catch-order | verified | CG E.31 order-hides quote; cppref try handler-seq; Bad rc=0 w/ documented `-Wexceptions`; tool id exists |
| cpp-err-no-throw-across-c | verified | libstdc++ "Compatibility With C" terminate/abort quote; cppref noexcept terminate; both rc=0 |
| cpp-err-translate-with-context | verified | cppref `throw_with_nested` captures current exception; FAQ translate/rethrow; both rc=0 |
| cpp-err-ctor-failure | verified | CG C.42 quote + X3 bad example; FAQ constructor-failure quote; both rc=0 |
| cpp-err-no-catch-all-swallow | verified | libstdc++ "not swallowed in gratuitous catch(...)" quote; CG E.17; both rc=0; tool id exists |
| cpp-err-error-code-check | verified | CG I.10 "if (error_code) ... use val" + E.28 global-state quote; cppref error_code; both rc=0 |
| cpp-err-noexcept-truthful | verified | cppref noexcept "std::terminate is called" quote; CG E.12/E.16; both rc=0; tool id exists |

**Counts: verified 16/16, rejected 0.**
**Blockers: none.** (Follow-up only: update `INDEX.md` verified count.)
