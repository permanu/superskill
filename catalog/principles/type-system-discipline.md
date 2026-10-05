---
id: principle-type-system-discipline
title: Encode distinctions the checker can enforce instead of trusting discipline
apply_when: Apply when a distinction, unit, nullability, or case split exists only in comments, naming conventions, or reviewer memory.
triggers:
  keywords: [type, compile, exhaustiveness, cast, nullability, units]
  symbols: [Option, Result, cast]
enforce: both
related: [principle-make-illegal-states-unrepresentable, principle-boundary-discipline, principle-model-the-domain]
status: verified
---
> Encode each real distinction as a type the checker enforces, not a comment it ignores.

## Patterns

- Wrap primitives that carry meaning: identifiers, units, money, and validated strings get distinct types instead of sharing one primitive.
- Handle every case explicitly and make the fallback fail loudly, so a new case cannot pass through silently.
- Confine each cast or dynamic escape hatch to one function, with the reason written beside it.
- Type absence explicitly, with an optional or sum type, instead of overloading null, empty string, zero, or -1.
- Prefer narrow annotations: exact element types, non-null types, and immutability where the value must not change.
- When a rule keeps being re-asserted in review, encode it as a type; when a type stops discriminating anything, delete it.
- Let the checker carry cross-module rules: if breaking the rule still compiles, the rule is a convention, not a constraint.

## Tests

- Which distinction in this change is enforced only by a comment or a name?
- Where does a cast erase information the checker could have kept?
- If a new variant is added, what fails at compile time?
- Which rule is re-asserted in review that a type could enforce instead?

## See Also

- [principle-make-illegal-states-unrepresentable](make-illegal-states-unrepresentable.md) — the flagship application of checker-enforced invariants.
- [principle-boundary-discipline](boundary-discipline.md) — casts and dynamic escapes belong at the boundary, not in the core.
- [principle-model-the-domain](model-the-domain.md) — distinct domain meanings become distinct types.
