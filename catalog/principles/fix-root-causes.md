---
id: principle-fix-root-causes
title: Fix the cause at the layer that owns the invariant
apply_when: Apply when a symptom appears in code that is not where the wrong value or decision originated.
triggers:
  keywords: [bug, root cause, regression, symptom, reproduce]
enforce: review
related: [principle-encode-lessons-in-structure, principle-evidence-hierarchy, principle-attack-the-premise]
status: verified
---
> Reproduce the failure, fix the layer that owns the broken invariant, and delete the workarounds.

## Patterns

- Reproduce the failure with the smallest input and keep that reproduction; a fix without it is a guess.
- Trace to the first point where the value or decision diverges from its contract; the crash site is usually downstream of it.
- Name the failed invariant and the layer that owns it, then fix that layer instead of every consumer that trips over it.
- Delete the symptom workarounds — defensive copies, retries, extra checks — once the producer is correct.
- Search for sibling occurrences of the same defect pattern and fix or file each one.
- When the true root is out of scope, say so, fix locally, and leave a tracked follow-up rather than mislabeling the symptom as the cause.
- Keep the reproduction as a regression test at the lowest layer that can catch this class of failure.

## Tests

- What is the smallest input that reproduces the failure, and where does the wrong value first appear?
- Which layer owns the invariant this fix restores?
- Which workaround can now be deleted?
- Which sibling sites share the same defect, and what is each one's status?

## See Also

- [principle-encode-lessons-in-structure](encode-lessons-in-structure.md) — the reproduction becomes a permanent guard.
- [principle-evidence-hierarchy](evidence-hierarchy.md) — the reproduction is the evidence the fix must satisfy.
- [principle-attack-the-premise](attack-the-premise.md) — the reported cause is itself a premise to check.
