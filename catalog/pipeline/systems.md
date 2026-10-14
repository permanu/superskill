---
name: systems
pack: pipeline
always: true
triggers: [system, systems, architecture, distributed, service, feedback, loop, boundary, data flow, tenant]
---

# Systems thinking

Think in **systems**, not tickets. A change is a cut through stocks, flows, and feedback.

Use this for system boundaries, shared state, service/data-flow changes, or explicit architecture work—not for an unrelated typo.

Before you code or rubber-stamp a review, name:

1. **Boundary** — what is in this system (this service, this tenant, this repo)? What is outside?
2. **Stock** — what accumulates (rows, sessions, queue, error budget, cache)?
3. **Flow** — what moves (request → authz → store; job → worker → sink)?
4. **Feedback** — what will this change amplify or dampen next week (more activations, more edges, more toil)?
5. **Delay** — when does the effect show (TTL, cache, next deploy, next batch)?
6. **Who is hurt** if the invariant is wrong?

If repository evidence cannot resolve a concrete decision about a boundary, stock, flow, or consequence—and that decision changes the safe solution—name it and use `pipeline/grill`. An applicable systems question alone is not a blocker; continue independent work.

A typo does not need a grill. An auth change, a new store, or “I’m not sure” does.
