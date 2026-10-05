---
id: principle-migrate-callers-then-delete
title: Migrate every caller before deleting the old path
apply_when: Apply when replacing an API, schema, flag, or code path that other code or artifacts still use.
triggers:
  keywords: [migration, deprecation, caller, compatibility, rename, delete]
enforce: review
related: [principle-sequence-verifiable-units, principle-subtract-before-you-add, principle-make-operations-idempotent]
sources:
  - title: Parallel Change (Martin Fowler)
    url: https://martinfowler.com/bliki/ParallelChange.html
status: verified
---
> Add the new path, move every caller to it, then delete the old path.

## Patterns

- Add the new path beside the old so both work while callers move.
- Migrate every caller in the same change when the list is short; otherwise enumerate the callers and track the list.
- Search beyond code: configuration, serialized data, reflection, documentation, and scripts can hold the old name.
- Delete the old path when the last caller moves; a compatibility shim with no callers is pure maintenance tax.
- For data or wire formats, run expand, migrate, and contract as separate verifiable steps.
- Give each deprecation an owner and a removal trigger, never "eventually".
- Verify the deletion: the full build and test suite pass with the old path gone and no reference remains.

## Tests

- Who calls the old path today, and is each caller on the migration list?
- Can the old path be deleted in this change; if not, what exactly still depends on it?
- Does any non-code artifact reference the old name?
- Is each deprecation's removal trigger recorded with an owner?

## See Also

- [principle-sequence-verifiable-units](sequence-verifiable-units.md) — expand, migrate, and contract are the units.
- [principle-subtract-before-you-add](subtract-before-you-add.md) — the old path is the subtraction this change owes.
- [principle-make-operations-idempotent](make-operations-idempotent.md) — data migrations must survive re-runs.
