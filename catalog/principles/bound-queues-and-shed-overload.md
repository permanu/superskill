---
id: principle-bound-queues-and-shed-overload
title: Bound every queue and shed overload by policy
apply_when: Apply when introducing or reviewing a buffer between a producer and a slower consumer — queues, job lists, write buffers.
triggers:
  keywords: [queue, backlog, backpressure, overload, saturation, shedding]
enforce: review
related: [principle-separate-before-serializing-shared-state, principle-explain-the-number]
sources:
  - title: AWS Builders' Library — Avoiding insurmountable queue backlogs
    url: https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/
  - title: AWS Builders' Library — Using load shedding to avoid overload
    url: https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/
status: verified
---
> An unbounded queue converts overload into latency and memory; bound it and decide who is refused first.

## Patterns

- Give every buffer a maximum depth and a maximum memory, derived from a stated drain-time budget.
- Decide the overflow policy before it fires: shed by priority, refuse at admission, or push back on producers.
- Prefer backpressure to buffering: a producer that waits keeps the backlog bounded by construction.
- Measure backlog depth and drain time, and alarm on the trend, not only on the limit.
- Keep the shed path cheap and observable; a refusal with a reason beats a request that ages out silently.
- Re-derive the bound when the consumer's rate, the burst size, or the latency budget changes.

## Tests

- What is the maximum backlog, and how long does it take to drain at the consumer's real rate?
- What happens at the limit — who is refused first, and what reason do they receive?
- Where is the depth or memory bound derived from a budget, and what invalidates it?
- Can the producer detect backpressure, or does it keep writing into a growing buffer?
- What does an operator see while the backlog grows, before anything fails?

## See Also

- [principle-separate-before-serializing-shared-state](separate-before-serializing-shared-state.md) — partitioning bounds one queue's contention; the bound is still yours to set.
- [principle-explain-the-number](explain-the-number.md) — depth, memory, and drain time are constants that need a derivation.
