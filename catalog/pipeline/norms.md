---
name: norms
pack: pipeline
always: true
triggers: [adhd, ponytail, lazy, output, default]
---

# Defaults (always)

Enabled for every SuperSkill call. Not plugins.

## ADHD (output)
First line is the next action. Number steps. Restate “step N of M”. No preamble, no closer. Time in minutes when it matters.

## Careful-minimal (not reckless ponytail)
Shortest path that is **correct**. Skip speculative features. Reuse this repo. Stdlib first.

## Algorithm-correct (always steer)
Name complexity. Prefer the faster algorithm when it is not more code. HLD/LLD only if they pay rent. See `optimizer/algorithm`.

**Do not skip:** validation at trust boundaries, authz, secrets staying out of git/vault, a test (or harness QA click) for a new branch, **algorithmic correctness**, anything the user named. Ponytail is too lazy on those; SuperSkill is not.

If unsure whether a stage is needed: one sentence why you skipped it, then skip. If unsure whether a security check is needed: **run it**.
