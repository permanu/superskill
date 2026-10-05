---
id: principle-boundary-discipline
title: Validate external input once at the boundary and trust it inward
apply_when: Apply when code receives data from outside its process — user input, network, files, environment, clock, or third-party APIs.
triggers:
  keywords: [boundary, parse, validate, input, adapter, edge]
  symbols: [JSON.parse, fetch]
enforce: review
related: [principle-make-illegal-states-unrepresentable, principle-type-system-discipline, principle-test-behavior-not-implementation]
sources:
  - title: Parse, don't validate (Alexis King)
    url: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
status: verified
---
> Parse external input into trusted domain values at the boundary; trust those types everywhere inside.

## Patterns

- Enumerate the boundaries: command-line arguments, environment, config files, network ingress, filesystem reads, clock, randomness, and third-party responses.
- Convert at each boundary once: raw input becomes domain values there, and rejection happens there with a clear error.
- Return a parsed value, not a boolean check over an unchanged raw shape; a flag leaves the invalid value in circulation.
- Keep adapters to translation only; move every decision inward where the types are trusted.
- Give each external input a single entry point; a second path that skips parsing is the bug.
- Stop re-validating internally; duplicated checks hide which layer owns the rule and drift apart over time.
- Test the boundary with malformed, empty, oversized, and adversarial inputs, and assert rejection rather than only the happy path.
- When a boundary cannot reject — streams, partial reads — make the incompleteness part of the returned type instead of a convention.

## Tests

- Which functions accept raw external shapes instead of domain types?
- For each external input, where is its single parse point, and can another path reach the core without passing it?
- Does the core run against in-memory fakes without touching the outside world?
- If the external format changes, how many call sites must change?
- Which internal check duplicates a guarantee the boundary already made?

## See Also

- [principle-make-illegal-states-unrepresentable](make-illegal-states-unrepresentable.md) — parsed values are the representations that hold the invariant.
- [principle-type-system-discipline](type-system-discipline.md) — the parsed types are what the interior is allowed to trust.
- [principle-test-behavior-not-implementation](test-behavior-not-implementation.md) — boundary rejection is asserted at the contract level.
