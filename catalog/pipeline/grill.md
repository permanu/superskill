---
name: grill
pack: pipeline
always: false
triggers: [grill, hitl, human in the loop, design review, unclear, tradeoff]
---

# Grill (human in the loop)

Learned from Matt’s grill: an unresolved decision can become a bug. Pause only for a specific decision that changes acceptance or the safe solution and cannot be resolved from repository evidence, tests, or an available authority. Name the missing decision and why evidence cannot settle it. One question at a time; offer a recommendation. Continue independent work while the blocked branch waits.

## When
- A named review finding whose resolution depends on a decision no evidence can settle
- A new stock/flow (table, MCP tool, tenant path) whose safe shape remains undecided after inspecting the repository and evidence
- Security / money / identity when authorization, ownership, or acceptance remains unknown after evidence checks
- The user is choosing among architectures
An applicable review axis is not itself an open decision; inspect evidence first. Skip: typo, proven one-line, evidence-resolved questions, or a branch the user already closed.

## How
Ask until the branch is closed. Max 5 questions per pause, then wait.

Systems prompts (pick the ones that are open):

1. What is the **done** line, in one sentence they would sign?
2. What is **out of scope** this change?
3. If this fails in prod, what is the **rollback**?
4. Who is the **tenant / actor**, and what must they not see?
5. What **feedback loop** does this create (more writes, more tokens, more pages)?
6. Which existing module in **this repo** owns this? If the answer is “a new runtime / new app”, why?

Write the answers into the vault (`decide` or `learn`) so the next agent is not grilled on the same branch.
