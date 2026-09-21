---
name: systems
pack: pipeline
always: true
triggers: [system, systems, feedback, loop, boundary]
---

# Systems thinking (always)

Think in **systems**, not tickets. A change is a cut through stocks, flows, and feedback.

Before you code or rubber-stamp a review, name:

1. **Boundary** — what is in this system (this service, this tenant, this repo)? What is outside?
2. **Stock** — what accumulates (rows, sessions, queue, error budget, cache)?
3. **Flow** — what moves (request → authz → store; job → worker → sink)?
4. **Feedback** — what will this change amplify or dampen next week (more activations, more edges, more toil)?
5. **Delay** — when does the effect show (TTL, cache, next deploy, next batch)?
6. **Who is hurt** if the invariant is wrong?

If any of those is unnamed on a **new surface** or a **review you cannot n/a**, stop and **grill the human** (`pipeline/grill`). Do not invent the missing branch.

A typo does not need a grill. An auth change, a new store, or “I’m not sure” does.
