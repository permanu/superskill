---
id: principle-make-illegal-states-unrepresentable
title: Make illegal states unrepresentable
apply_when: Apply when designing types, flags, or lifecycle stages that carry rules about which combinations are valid.
triggers:
  keywords: [state, invariant, type, model, validation, flag]
  symbols: [Option, Result, Either, enum]
enforce: both
related: [principle-type-system-discipline, principle-model-the-domain, principle-boundary-discipline]
sources:
  - title: Effective ML (Yaron Minsky, Jane Street)
    url: https://blog.janestreet.com/effective-ml-revisited/
status: verified
---
> Encode every domain invariant in the representation so invalid values cannot be constructed or passed.

## Patterns

- List every illegal combination of fields, flags, and lifecycle stages before choosing a representation.
- Replace boolean pairs and nullable clusters with one tagged union whose cases carry only the fields each case needs.
- Route construction through one smart constructor that validates and normalizes; keep raw constructors private.
- Model lifecycle as a sequence of states with explicit transitions instead of independent status flags that can contradict each other.
- Return an optional or sum type for partial operations instead of null, -1, empty string, or a sentinel object.
- Push each invariant into the narrowest type that owns it — an identifier, a non-empty list, a parsed value — instead of re-checking it in every consumer.
- Leave runtime validation only where values enter from outside; internal call sites rely on the checker.

## Tests

- Which invalid combination can a caller still construct without passing through the smart constructor?
- How many states does this representation admit, and how many of them are legal?
- Is each invariant enforced by the checker at every internal call site, or re-asserted by hand?
- When a new case is added, what forces every consumer to handle it?

## See Also

- [principle-type-system-discipline](type-system-discipline.md) — the checker is the mechanism that enforces the encoding.
- [principle-model-the-domain](model-the-domain.md) — the domain model supplies the invariants to encode.
- [principle-boundary-discipline](boundary-discipline.md) — construction validation happens where external values enter.
