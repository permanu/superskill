---
id: principle-propagate-deadlines
title: Derive every outbound deadline from the caller's remaining budget
apply_when: Apply when setting timeouts or cancellation on outbound calls that run inside a caller's own deadline.
triggers:
  keywords: [deadline, cancellation, cascade, propagation]
enforce: review
related: [principle-explain-the-number, principle-budget-retries-against-headroom]
sources:
  - title: Google SRE Book — Addressing Cascading Failures
    url: https://sre.google/sre-book/addressing-cascading-failures/
  - title: gRPC — Deadlines
    url: https://grpc.io/docs/guides/deadlines/
status: verified
---
> A child call's deadline is the caller's remaining time, minus the work still owed after it returns.

## Patterns

- Compute each outbound deadline from the caller's remaining budget; never give a child more time than the parent has left.
- Carry the deadline across hops, so every layer stops waiting at the same instant instead of at N stacked timeouts.
- Propagate cancellation with the deadline: a caller that gave up must be able to tell downstream to stop.
- Treat a timeout as "stop waiting", not "stop working": the downstream continues and still burns capacity for a result nobody will read.
- Record the budget arithmetic beside the numbers — caller budget, own work, hop allowance — so the values can be checked.
- Leave headroom between the child deadline and the parent deadline for the parent's own post-processing.

## Tests

- What is the caller's remaining budget at the moment this call starts?
- Does the child's deadline fit inside the parent's remaining deadline, or does it outlive it?
- When the caller stops waiting, what does the downstream keep doing, and for how long?
- Can cancellation travel the whole call chain, or does it stop at the first boundary?
- Where is the deadline arithmetic written down, and what invalidates it?

## See Also

- [principle-explain-the-number](explain-the-number.md) — a deadline is a constant that needs a derivation.
- [principle-budget-retries-against-headroom](budget-retries-against-headroom.md) — retry attempts must fit the same deadline budget.
