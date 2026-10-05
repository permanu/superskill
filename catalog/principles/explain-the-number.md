---
id: principle-explain-the-number
title: Justify every constant with a derivation or a source
apply_when: Apply when introducing or reviewing a literal number — timeout, retry count, buffer size, threshold, limit, or budget.
triggers:
  keywords: [constant, magic number, timeout, threshold, units]
enforce: review
related: [principle-evidence-hierarchy, principle-minimize-reader-load, principle-boundary-discipline]
status: verified
---
> Give every constant a derivation, a unit, and the condition that invalidates it.

## Patterns

- Name constants with their unit: timeout_ms, max_bytes, retry_count.
- State the derivation — measurement, spec limit, capacity math, safety margin — and link or record it.
- Derive values that depend on other facts; one formula beats two numbers that must agree.
- State the failure on both sides: too small causes false failures or dropped data, too large costs latency, memory, or money.
- Keep each value in one place; duplicated literals drift apart.
- Set a revisit trigger: the load, dataset size, or dependency version that invalidates the value.
- For externally imposed limits, cite the standard and its version.

## Tests

- Where does this number come from, and what evidence or source backs it?
- What breaks if it is ten times too small or ten times too large?
- Is the unit in the name, and does the value appear in only one place?
- What condition would make this value wrong, and is that condition tracked?

## See Also

- [principle-evidence-hierarchy](evidence-hierarchy.md) — a derivation is the evidence a constant needs.
- [principle-minimize-reader-load](minimize-reader-load.md) — a justified number removes a mystery from the reader's path.
- [principle-boundary-discipline](boundary-discipline.md) — externally imposed limits arrive with the boundary's standard.
