---
name: plan
pack: pipeline
always: false
triggers: [prd, spec, grill, brainstorm, write a plan, design doc]
---

# Plan / grill (from Matt + Superpowers — our vault)

Learned: stress-test the design **before** code; write a plan a stranger could execute. We store it in **this project's vault**, not their CONTEXT.md paths.

## When
New product slice, unclear requirements, or the user asked for a spec. Skip for a known one-line fix.

## Loop
1. Grill: every branch of the design (auth, data, failure, rollback) until named.
2. One page in the vault (`decide` / ADR): invariant, files to touch, test, out of scope.
3. Tickets as vertical slices with a done line each.
4. Then implement — do not start coding mid-grill.

User instructions override the plan. SuperSkill does not own the host's process (no mandatory worktrees).
