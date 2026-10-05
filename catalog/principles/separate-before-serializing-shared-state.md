---
id: principle-separate-before-serializing-shared-state
title: Separate state before serializing access to it
apply_when: Apply when multiple workers, requests, or tasks mutate the same state and a lock or queue is the proposed fix.
triggers:
  keywords: [concurrency, lock, contention, shard, ownership, shared state]
enforce: review
related: [principle-make-operations-idempotent, principle-model-the-domain, principle-fix-root-causes]
status: verified
---
> Partition shared mutable state so each writer owns a slice; serialize only what cannot be separated.

## Patterns

- Name what is shared and which operations collide, and measure the contention before choosing a mechanism.
- Partition by a stable key — account, tenant, shard — so operations on different keys never touch the same cell.
- Give each partition a single owner: one task, thread, or serialized queue per key, with messages instead of shared memory.
- Prefer immutable values and append-only events to in-place mutation; readers then need no coordination.
- Keep locks narrow and named: one lock per resource, never one lock for a module.
- When separation is impossible, serialize deliberately and document the critical section's cost and ordering.
- Cross-process state needs an owner too — a transaction in a store, not a file lock held by convention.

## Tests

- Which two operations collide today, and on what exact state?
- Can the state be split by a key so each writer owns its slice?
- Is the lock protecting a real invariant, or covering for shared ownership?
- What happens to in-flight work when a partition owner restarts?

## See Also

- [principle-make-operations-idempotent](make-operations-idempotent.md) — retry safety removes pressure to serialize.
- [principle-model-the-domain](model-the-domain.md) — ownership boundaries follow domain boundaries.
- [principle-fix-root-causes](fix-root-causes.md) — contention is a symptom of shared ownership, not of missing locks.
