---
id: principle-schema-change
title: Make schema changes reversible
apply_when: Apply when altering persistent storage layouts.
triggers:
  keywords: [migration, schema]
  files: ["**/*.sql"]
enforce: review
status: verified
---
> Ship a rollback path with every schema change.

## Patterns

- Add before removing.
- Keep the old column readable until the backfill lands.

## Tests

- What is the rollback statement for this migration?
