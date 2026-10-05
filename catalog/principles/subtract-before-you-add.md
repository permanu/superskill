---
id: principle-subtract-before-you-add
title: Try deletion and reuse before addition
apply_when: Apply when about to add code, a dependency, an abstraction, or a configuration path to satisfy a requirement.
triggers:
  keywords: [delete, simplify, dependency, abstraction, dead code]
enforce: review
related: [principle-laziness-protocol, principle-migrate-callers-then-delete, principle-minimize-reader-load]
status: verified
---
> Satisfy the requirement by deleting, reusing, or configuring before writing anything new.

## Patterns

- First pass: meet the requirement by deleting code, changing data or configuration, or reusing what already exists.
- Read the diff in both directions; a change that adds more than it removes needs a stated reason.
- Do not abstract for a single caller; inline the logic until a second real caller appears.
- Prefer the standard library or an existing in-repo utility over a new dependency; name what a new dependency replaces and what it costs.
- Delete code, flags, and comments that this change orphans — a caller removed, a path made unreachable — instead of leaving them behind.
- Place additions at the smallest fitting seam and follow the conventions already there.
- Re-check scope after the first working version and cut everything the acceptance criteria do not require.

## Tests

- What was deleted or reused in this change?
- Does each new file, type, or dependency have a second caller or a named requirement it uniquely serves?
- If this addition were removed, which acceptance criterion would fail?
- Is any code in the diff unrelated to the task?

## See Also

- [principle-laziness-protocol](laziness-protocol.md) — deletion and reuse are the first acts of deliberate deferral.
- [principle-migrate-callers-then-delete](migrate-callers-then-delete.md) — removal becomes safe only after callers move.
- [principle-minimize-reader-load](minimize-reader-load.md) — less code is the cheapest reading aid.
