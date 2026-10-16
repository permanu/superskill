---
id: principle-type-system-discipline
title: Encode distinctions the checker can enforce instead of trusting discipline
apply_when: Apply when a distinction, unit, nullability, or case split exists only in comments, naming conventions, or reviewer memory.
triggers:
  keywords: [type, compile, exhaustiveness, cast, nullability, units]
  symbols: [Option, Result, cast]
enforce: both
related: [principle-make-illegal-states-unrepresentable, principle-boundary-discipline, principle-model-the-domain]
sources:
  - title: The Rust Programming Language — Advanced Types
    url: https://doc.rust-lang.org/book/ch20-03-advanced-types.html
  - title: The Rust Programming Language — Defining an Enum
    url: https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html
  - title: The Rust Programming Language — The match Control Flow Construct
    url: https://doc.rust-lang.org/book/ch06-02-match.html
status: verified
---
> Use the language's checker to enforce meaningful distinctions where it can, and state what remains a runtime obligation.

## Patterns

- Use distinct types for primitives whose accidental interchange would be a bug; a type alias may provide naming without enforcing a distinction.
- Use exhaustive handling for closed variants; avoid catch-all branches that hide new cases. Open protocols may need an explicit unknown case for compatibility.
- Keep casts and dynamic escape hatches localized, with their unchecked assumptions explicit.
- Model absence with the language's checked optional, nullable, or sum type instead of ambiguous sentinel values.
- Prefer narrow annotations: exact element types, non-null types, and immutability where the value must not change.
- When review repeatedly catches a distinction the checker can express, consider encoding it; retain useful abstraction types even when they do not add a new constraint.
- Verify what the actual checker rejects; types do not replace runtime validation for external data, changing state, or invariants the language cannot express.

## Tests

- Which distinction in this change is enforced only by a comment or a name?
- Where does a cast erase information the checker could have kept?
- If a new variant is added, what fails at compile time?
- Which rule is re-asserted in review that a type could enforce instead?

## See Also

- [principle-make-illegal-states-unrepresentable](make-illegal-states-unrepresentable.md) — the flagship application of checker-enforced invariants.
- [principle-boundary-discipline](boundary-discipline.md) — casts and dynamic escapes belong at the boundary, not in the core.
- [principle-model-the-domain](model-the-domain.md) — distinct domain meanings become distinct types.
