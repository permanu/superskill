---
id: principle-sequence-verifiable-units
title: Land work in units that can each be verified
apply_when: Apply when a task spans multiple steps, files, or commits, or when part of the work can land before the rest.
triggers:
  keywords: [sequence, steps, commit, incremental, verify]
enforce: both
related: [principle-evidence-hierarchy, principle-migrate-callers-then-delete, principle-guard-the-context-window]
status: verified
---
> Land work in ordered units that each end in a runnable, verified state.

## Patterns

- Define each unit's check before starting it: the command, test, or observation that proves the unit works.
- Order units so every boundary is coherent — the build passes, tests pass, and no caller is left broken.
- Slice vertically: one requirement end to end beats one layer per step that cannot run until the last step.
- Keep each unit reviewable alone; if its description needs "and", split it.
- Run the unit's check before starting the next unit; a red result stops the sequence and becomes the next unit of work.
- Separate mechanical changes from behavioral ones so the behavioral diff stays small enough to verify.
- When a unit cannot be made safe alone, name the sequence it belongs to and land the units in that order.

## Tests

- What is the check for this unit, and did it pass before the next unit started?
- Does the build and test suite pass at this boundary, with no caller waiting on unlanded work?
- Can this unit be reviewed without reading the next one?
- Which changes in this sequence are mechanical and which are behavioral?

## See Also

- [principle-evidence-hierarchy](evidence-hierarchy.md) — each unit's check is the evidence for that unit.
- [principle-migrate-callers-then-delete](migrate-callers-then-delete.md) — the canonical multi-step migration sequence.
- [principle-guard-the-context-window](guard-the-context-window.md) — unit boundaries are the natural points to persist progress.
