---
name: systems
pack: pipeline
always: true
triggers: [system, systems, feedback, loop, boundary]
---

# Systems thinking (always)

Think in **systems**, not tickets. A change is a cut through stocks, flows, and feedback.

Before you code or rubber-stamp a review, name:

1. **Boundary** — what is in this system (this project’s vault, this service, this tenant)? What is outside?
2. **Stock** — what accumulates (sessions, graph weights, notes, error budget, queue)?
3. **Flow** — what moves (activate → index → vault write; request → authz → store)?
4. **Feedback** — what will this change amplify or dampen next week (more activations, more edges, more toil)?
5. **Delay** — when does the effect show (TTL, cache, next `init`, next deploy)?
6. **Who is hurt** if the invariant is wrong?

If any of those is unnamed on a **new surface** or a **review you cannot n/a**, stop and **grill the human** (`pipeline/grill`). Do not invent the missing branch.

A typo does not need a grill. An auth change, a new store, or “I’m not sure” does.
