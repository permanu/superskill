---
name: investigate
pack: pipeline
always: false
triggers: [bug, fail, error, investigate, diagnose, incident, flake, regression]
---

# Investigate (staff, not folklore)

A report names a **symptom**. Do not edit until you can name the invariant that broke.

## Order
1. Reproduce or quote a log/test that fails. If you cannot, one diagnostic question — not five.
2. List hypotheses, cheapest disproof first (wrong env, stale cache, different code path).
3. Grep the symbol and **all callers**. Patching only the ticket path leaves siblings broken.
4. If the last three attempts did not move the error, stop coding. The assumption is wrong.

## Edge cases
- Intermittent: record seed, timezone, race (shared mutable, missing await, lock across await).
- "Works on my machine": Node/tool version, `VAULT_PATH`, cwd vs git root.
- Security-looking failure: treat as security stage, do not log tokens while debugging.

Do not add a retry loop to hide the cause. Do not catch-and-ignore `EACCES` / `EISDIR`.
