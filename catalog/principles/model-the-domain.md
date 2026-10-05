---
id: principle-model-the-domain
title: Name and shape code after the domain
apply_when: Apply when introducing concepts, entities, or state transitions, or when existing names do not match how the domain talks.
triggers:
  keywords: [domain, model, naming, vocabulary, entity]
enforce: review
related: [principle-make-illegal-states-unrepresentable, principle-type-system-discipline, principle-minimize-reader-load]
sources:
  - title: Ubiquitous Language (Martin Fowler)
    url: https://martinfowler.com/bliki/UbiquitousLanguage.html
status: verified
---
> Name and shape the code after the domain, one name per concept.

## Patterns

- List the domain's nouns, verbs, and states with the people who use them; adopt their words in code, tests, and error messages.
- One concept, one name everywhere; ban synonyms for the same thing and one word for two things.
- Write the state machine down — states, transitions, triggers — before coding it; contradictions surface there, not in the diff.
- Keep domain rules in the model layer, not in controllers, UI copy, or database constraints alone.
- Keep transport, storage, and presentation shapes out of the model; translate at the edges.
- Rename across the codebase in one mechanical pass when the domain changes; old and new terms do not coexist.
- Reject names that describe implementation machinery — Manager, Helper, Data — in favor of names that describe domain roles.

## Tests

- Would a domain expert recognize every name in this change?
- Where is the state machine written down, and does the code match it?
- Which domain rule lives outside the model, and who enforces it?
- Does any concept have two names, or any name two meanings?

## See Also

- [principle-make-illegal-states-unrepresentable](make-illegal-states-unrepresentable.md) — the model's invariants become the representation.
- [principle-type-system-discipline](type-system-discipline.md) — domain distinctions become distinct types.
- [principle-minimize-reader-load](minimize-reader-load.md) — domain names let readers import context they already have.
