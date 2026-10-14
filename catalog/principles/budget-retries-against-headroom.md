---
id: principle-budget-retries-against-headroom
title: Budget retries against the dependency's headroom
apply_when: Apply when adding or reviewing retry behaviour on calls to a shared dependency — clients, jobs, webhooks, queues.
triggers:
  keywords: [retries, backoff, jitter, storm, amplification, headroom]
enforce: both
related: [principle-make-operations-idempotent, principle-explain-the-number, principle-propagate-deadlines]
sources:
  - title: Google SRE Book — Handling Overload
    url: https://sre.google/sre-book/handling-overload/
  - title: AWS Builders' Library — Timeouts, retries and backoff with jitter
    url: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
status: verified
---
> A retry multiplies offered load; bound attempts by the capacity that remains, never by hope.

## Patterns

- Set a retry budget per caller and per dependency: a maximum share of total calls that may be retries, shared across every caller of the same dependency.
- Retry only operations that are safe to repeat; a retried write without an idempotency key duplicates the effect.
- Randomize each retry's delay so callers do not re-synchronize and re-collide on the same dependency.
- Cap total attempts per request, and record the resulting amplification: offered load equals base load times attempts.
- When a dependency is already saturated, shed or fail fast instead of retrying; retries remove the slack a slow dependency needs to recover.
- Alarm on the amplification factor and on the retry-driven error share, not only on the dependency's own error rate.

## Tests

- What is the worst-case offered load this retry policy adds when the dependency slows to a crawl?
- Which budget caps total attempts, where is it enforced, and can one caller spend it for everyone?
- Is the backoff randomized per attempt, or do all callers retry in lockstep?
- Can a duplicate attempt corrupt state, and what key makes it safe?
- What happens to the dependency's recovery time when every caller retries three times?

## See Also

- [principle-make-operations-idempotent](make-operations-idempotent.md) — retry safety is the precondition for any retry policy.
- [principle-explain-the-number](explain-the-number.md) — a retry count and a budget are constants that need a derivation.
- [principle-propagate-deadlines](propagate-deadlines.md) — a retry only helps if its attempts fit the caller's remaining deadline.
