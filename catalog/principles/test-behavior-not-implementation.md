---
id: principle-test-behavior-not-implementation
title: Assert observable behavior, not implementation shape
apply_when: Apply when writing or reviewing tests that could break while behavior is unchanged.
triggers:
  keywords: [test, behavior, mock, refactor, assertion]
enforce: both
related: [principle-evidence-hierarchy, principle-sequence-verifiable-units, principle-encode-lessons-in-structure]
sources:
  - title: Mocks Aren't Stubs (Martin Fowler)
    url: https://martinfowler.com/articles/mocksArentStubs.html
status: verified
---
> Write tests that fail when the contract breaks and survive refactors that preserve it.

## Patterns

- Drive the test through the public entry point a caller uses, and assert the returned value, emitted event, or observable state.
- Assert outcomes, not call order; verifying internal interactions couples the test to today's implementation.
- Fake only true external boundaries — network, clock, randomness, third-party services — never collaborators inside the unit under test.
- Make each test fail for one reason, and name the broken behavior in the failure message.
- Cover the cases that carry the contract: empty, malformed, boundary values, and the error path.
- Treat a test edit forced by a behavior-preserving refactor as proof the test was implementation-coupled; rewrite it.
- Name tests for the guarantee, not the method: "rejects expired tokens", not "calls validateToken".

## Tests

- Would this test fail if the behavior it names regressed, and pass after a behavior-preserving refactor?
- Does the test assert a value or observable state, or merely that certain calls happened?
- Which external boundary does each fake replace?
- Which behavior in this change has no test at the contract level?

## See Also

- [principle-evidence-hierarchy](evidence-hierarchy.md) — behavior tests are the evidence that claims rest on.
- [principle-sequence-verifiable-units](sequence-verifiable-units.md) — tests define each unit's boundary.
- [principle-encode-lessons-in-structure](encode-lessons-in-structure.md) — a regression test is the default structural guard.
