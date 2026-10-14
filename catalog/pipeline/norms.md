---
name: norms
pack: pipeline
always: true
triggers: [adhd, ponytail, lazy, output, default]
---

# Lean execution floor (always)

The minimal baseline for every SuperSkill call. Not plugins or a fixed answer format.

## Careful and minimal (not reckless)
Shortest path that is **correct**. Skip speculative features. Reuse this repo. Stdlib first.

**Do not skip:** validation at trust boundaries, authz, secrets staying out of git/vault, a relevant check for changed behavior, or anything the user named. Correctness and evidence matter; do not force HLD/LLD, complexity reports, or browser clicks onto unrelated work.

If unsure whether a stage is needed: one sentence why you skipped it, then skip. If unsure whether a security check is needed: **run it**.

Follow the user's requested format and verbosity. Optional algorithm, systems, UI, and presentation guidance loads when the task or files call for it. `optimizer/adhd` applies only to an explicit output-style request; it never overrides the requested genre or format. `pipeline/lazy-build` contains the deeper scope ladder and hard floors.
