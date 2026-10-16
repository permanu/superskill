---
id: principle-laziness-protocol
title: Defer speculative work without dropping current obligations
apply_when: Apply when a decision, abstraction, or feature can be postponed without blocking current acceptance.
triggers:
  keywords: [defer, premature, speculative, trigger, decision]
enforce: review
related: [principle-subtract-before-you-add, principle-exhaust-the-design-space, principle-never-block-on-the-human]
sources:
  - title: Martin Fowler — Yagni
    url: https://martinfowler.com/bliki/Yagni.html
status: verified
---
> Do the least work that meets today's requirement; defer the rest with a named trigger.

## Patterns

- Ask which current acceptance criterion this work serves; a hypothetical future is not one.
- Defer expensive commitments only while the cost of waiting is acceptable; account for lead time and keep the decision visible.
- Build the concrete case first; build the general mechanism only when a real requirement demands it, not to cover imagined cases.
- Isolate uncertainty behind an interface only when it serves the current design; do not ship a stub as completed required behavior.
- Give every deferral a trigger — event, date, or condition — and record it; "later" is not a trigger.
- Preserve verification, error handling, and security obligations for the current scope; label any incomplete checks rather than claiming completion.
- Record deferrals where the next reader will hit them, not in a distant backlog.

## Tests

- Which current acceptance criterion does this work serve?
- What is the named trigger that would make this work necessary, and is it recorded?
- Is this decision reversible at low cost; if not, is it being made too early or too late?
- Did any deferral drop verification, error handling, or security work?

## See Also

- [principle-subtract-before-you-add](subtract-before-you-add.md) — deletion is the cheapest form of deferral.
- [principle-exhaust-the-design-space](exhaust-the-design-space.md) — deferral is a decision and deserves the option set.
- [principle-never-block-on-the-human](never-block-on-the-human.md) — reversible choices are what let work continue.
