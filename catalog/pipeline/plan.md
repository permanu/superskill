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
1. Resolve each design branch from repository evidence first; grill only a named decision that evidence cannot settle (auth, data, failure, rollback). If it adds or moves work on a shared path, name the load it must survive and what fails first.
2. One page in the vault — `brainstorm` while the options are open; `decide` / ADR once the branch closes: invariant, files to touch, test, out of scope.
3. Tickets as vertical slices with a done line each.
4. Then implement; do not guess on the blocked branch, but continue independent work while it waits.

User instructions override the plan. SuperSkill does not own the host's process (no mandatory worktrees).
