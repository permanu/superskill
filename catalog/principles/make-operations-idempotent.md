---
id: principle-make-operations-idempotent
title: Make write operations safe to repeat
apply_when: Apply when an operation can be retried, delivered twice, or re-run — network calls, jobs, migrations, scripts, handlers.
triggers:
  keywords: [idempotent, retry, duplicate, upsert, migration]
enforce: both
related: [principle-separate-before-serializing-shared-state, principle-fix-root-causes, principle-migrate-callers-then-delete]
sources:
  - title: RFC 9110 — HTTP Semantics (idempotent methods)
    url: https://www.rfc-editor.org/rfc/rfc9110.html
status: verified
---
> Design every retryable write so running it twice leaves the same state as running it once.

## Patterns

- Ask what a duplicate delivery does; if the answer is two records, the operation needs a key.
- Accept a caller-supplied idempotency key on creates, store it with the result, and return the original result on replay.
- Use upserts or compare-and-set for state changes instead of blind inserts and increments.
- Treat "already exists" as success when the stored state matches the intent; fail only on a real conflict.
- Guard script and migration steps with presence checks so a re-run after partial failure is safe.
- Make deletes idempotent: removing an absent thing succeeds.
- Isolate non-repeatable side effects — email, payment — behind a once-only record keyed by the operation id.

## Tests

- Which test runs this operation twice, and what state does the second run leave?
- What key makes a duplicate detectable, and is it stored atomically with the effect?
- After a partial failure, can the operation re-run from the start without corrupting state?
- Which side effects cannot repeat, and what record prevents them?

## See Also

- [principle-separate-before-serializing-shared-state](separate-before-serializing-shared-state.md) — retry-safe operations make partitioning tractable.
- [principle-fix-root-causes](fix-root-causes.md) — a duplicate write is a symptom to fix at the producer.
- [principle-migrate-callers-then-delete](migrate-callers-then-delete.md) — data migrations are the operations that get re-run.
