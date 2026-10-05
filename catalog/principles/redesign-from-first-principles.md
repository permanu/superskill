---
id: principle-redesign-from-first-principles
title: Re-derive the design from its requirements, not its history
apply_when: Apply when an existing design obstructs the change, or when a component has accumulated structure nobody can justify.
triggers:
  keywords: [redesign, refactor, legacy, requirements, interface]
enforce: review
related: [principle-exhaust-the-design-space, principle-subtract-before-you-add, principle-model-the-domain]
status: verified
---
> Restate what the component owes its callers, derive the ideal shape, then migrate toward it.

## Patterns

- Write the component's obligations — inputs, outputs, invariants, failure modes, load — without reference to the current implementation.
- Sketch the interface you would build today if nothing existed, and name the complexity each current element adds.
- Classify every existing element as requirement, accident, or history; keep only what earns its place.
- Redesign the boundary first; internals can follow behind a stable interface.
- Derive the migration as ordered safe steps — strangler or parallel change — from the current shape to the target.
- Record the target design and why the current one fails so the migration survives its author.
- Do not rewrite for novelty; the goal is fit to the obligations, not newness.

## Tests

- What does this component owe its callers, stated without reference to its implementation?
- Which current structures are requirements, and which are accidents of history?
- What is the first verifiable step from here toward the derived design?
- Does the redesign preserve the listed obligations, including failure behavior?

## See Also

- [principle-exhaust-the-design-space](exhaust-the-design-space.md) — the general option discipline this applies to an existing design.
- [principle-subtract-before-you-add](subtract-before-you-add.md) — the first win of a redesign is usually deletion.
- [principle-model-the-domain](model-the-domain.md) — obligations come from the domain, not from history.
