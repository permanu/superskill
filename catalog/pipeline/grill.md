---
name: grill
pack: pipeline
always: false
triggers: [grill, hitl, human in the loop, design review, unclear, tradeoff]
---

# Grill (human in the loop)

Learned from Matt’s grill: unresolved design branches stay bugs. SuperSkill **stops and asks**. One question at a time. Offer a recommended answer. Do not proceed on a guess.

## When
- Review axis you cannot honestly `n/a`
- New stock/flow (new table, new MCP tool, new tenant path)
- Security / money / identity
- The user is choosing among architectures
Skip: typo, proven one-line, they already answered.

## How
Ask until the branch is closed. Max 5 questions per pause, then wait.

Systems prompts (pick the ones that are open):

1. What is the **done** line, in one sentence they would sign?
2. What is **out of scope** this change?
3. If this fails in prod, what is the **rollback**?
4. Who is the **tenant / actor**, and what must they not see?
5. What **feedback loop** does this create (more writes, more tokens, more pages)?
6. Which existing SuperSkill piece owns this (vault / index / router / catalog)? If “new runtime”, why?

Write the answers into the vault (`decide` or `learn`) so the next agent is not grilled on the same branch.
