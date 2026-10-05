---
id: principle-exhaust-the-design-space
title: Choose from several designs, not the first one
apply_when: Apply when selecting an approach, interface, or architecture where more than one plausible design exists.
triggers:
  keywords: [design, options, alternatives, tradeoff, decision]
enforce: review
related: [principle-attack-the-premise, principle-laziness-protocol, principle-redesign-from-first-principles]
status: verified
---
> Generate several genuinely different designs, compare them on named constraints, and record the losers.

## Patterns

- State the constraints first — load, latency, team, deadline, compatibility; options are only comparable against them.
- Generate at least three options that differ in mechanism, including doing nothing and the simplest possible thing.
- Sketch each option at interface level and name where it concentrates complexity.
- Compare on named axes with units: cost, failure modes, migration path, and what each makes hard later.
- Eliminate options with a stated reason, not a preference.
- Record the decision and the rejected options together so they are not relitigated.
- When two options survive, name the evidence that separates them and run the cheapest test.

## Tests

- How many genuinely different designs were considered, and how do they differ in mechanism?
- Which constraint eliminates each rejected option?
- What does the simplest option cost, and what does the null option cost?
- Where is the decision recorded, and can a reader see why the losers lost?

## See Also

- [principle-attack-the-premise](attack-the-premise.md) — premises constrain and eliminate options.
- [principle-laziness-protocol](laziness-protocol.md) — options can be deferred, not just selected.
- [principle-redesign-from-first-principles](redesign-from-first-principles.md) — the same option discipline applied to an existing design.
