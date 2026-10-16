---
id: principle-explain-the-number
title: Justify consequential constants with a derivation or a source
apply_when: Apply when introducing or reviewing a consequential numeric choice — timeout, retry count, buffer size, threshold, limit, or budget.
triggers:
  keywords: [constant, magic number, timeout, threshold, units]
enforce: review
related: [principle-evidence-hierarchy, principle-minimize-reader-load, principle-boundary-discipline]
sources:
  - title: AWS Builders' Library — Timeouts, retries, and backoff with jitter
    url: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
  - title: The Rust Programming Language — Advanced Types
    url: https://doc.rust-lang.org/book/ch20-03-advanced-types.html
status: verified
---
> Give consequential numeric choices a rationale, an explicit unit, and a reason to revisit them.

## Patterns

- Make units explicit through types or names such as timeout_ms, max_bytes, and retry_count; follow repository naming conventions.
- State the derivation — measurement, spec limit, capacity math, safety margin — and link or record it.
- Derive values that depend on other facts; one formula beats two numbers that must agree.
- State the failure on both sides: too small causes false failures or dropped data, too large costs latency, memory, or money.
- Keep values representing the same policy in one place; equal numbers with independent meanings need not share a constant.
- Set a revisit trigger: the load, dataset size, or dependency version that invalidates the value.
- For externally imposed limits, cite the standard and its version.

## Tests

- Where does this number come from, and what evidence or source backs it?
- What breaks if it is ten times too small or ten times too large?
- Is the unit explicit, and do uses of the same policy share its definition?
- What condition would make this value wrong, and is that condition tracked?

## See Also

- [principle-evidence-hierarchy](evidence-hierarchy.md) — a derivation is the evidence a constant needs.
- [principle-minimize-reader-load](minimize-reader-load.md) — a justified number removes a mystery from the reader's path.
- [principle-boundary-discipline](boundary-discipline.md) — externally imposed limits arrive with the boundary's standard.
