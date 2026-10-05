---
name: fix
pack: watchdog
always: false
triggers: [watchdog fix, apply fix, reclaim, quarantine, approve cleanup]
---

# Watchdog fix

Repair what was approved. Never silently delete; every reclamation is quarantined and reversible.

## Steps

1. `watchdog status` — pick the report and the findings to act on.
2. `watchdog fix --finding <id>` (or `--category <name>`) **without** `--apply` — show the dry-run plan.
3. After the user confirms, re-run with `--apply`.
4. Mechanical reclamation (e.g. `--category leaked-tmp`) moves files to `~/.superskill/quarantine/<timestamp>/` with a manifest; the manifest carries the undo path. Report it.
5. Steering and guardrail edits stay agent-applied: one source of truth, checks over rules. Mark them applied when done.
6. Verify: `watchdog status` shows no unexpected open findings, and if you touched the repo, its check command still passes.

Never delete harness session data, vault notes, or user files from `watchdog fix`. User data is report-only.

Completion: every action is applied, skipped with a reason, or failed with an error — never silent.
