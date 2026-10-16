---
id: principle-separate-before-serializing-shared-state
title: Separate state before serializing access to it
apply_when: Apply when multiple workers, requests, or tasks mutate the same state and a lock or queue is the proposed fix.
triggers:
  keywords: [concurrency, lock, contention, shard, ownership, shared state]
enforce: review
related: [principle-make-operations-idempotent, principle-model-the-domain, principle-fix-root-causes]
sources:
  - title: Tokio Tutorial — Shared state
    url: https://tokio.rs/tokio/tutorial/shared-state
  - title: The Rust Programming Language — Shared-State Concurrency
    url: https://doc.rust-lang.org/book/ch16-03-shared-state.html
status: verified
---
> Consider independent ownership before adding coordination; keep simple locking when it already fits the invariant and workload.

## Patterns

- Name what is shared and which operations collide, and measure the contention before choosing a mechanism.
- Partition by a stable key when invariants permit independent updates; shared indexes and cross-key transactions may still need coordination.
- Consider a single owner with message passing for stateful asynchronous work; short, low-contention operations may be simpler behind a mutex.
- Prefer immutable snapshots when useful, but synchronize publication and lifetime; append-only writers still need ordering and visibility rules.
- Keep locks scoped to the invariant they protect and critical sections short; splitting a lock must not break atomic multi-resource updates.
- When separation is impossible, serialize deliberately and document the critical section's cost and ordering.
- Cross-process coordination needs a mechanism with defined atomicity and failure behavior; do not assume an in-process mutex protects other processes.

## Tests

- Which two operations collide today, and on what exact state?
- Can the state be split by a key so each writer owns its slice?
- Is the lock protecting a real invariant, or covering for shared ownership?
- What happens to in-flight work when a partition owner restarts?

## See Also

- [principle-make-operations-idempotent](make-operations-idempotent.md) — retry safety removes pressure to serialize.
- [principle-model-the-domain](model-the-domain.md) — ownership boundaries follow domain boundaries.
- [principle-fix-root-causes](fix-root-causes.md) — diagnose contention and invariant violations before choosing coordination.
