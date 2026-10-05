---
description: superskill watchdog — dig for agent-environment issues, fix what I approve
---
<!-- superskill:command -->
Run a superskill watchdog pass. Input: $ARGUMENTS (empty = dig the latest session).

1. Call the superskill MCP tool `watchdog` with action "dig" and the scope implied by the input (session | window --since 7d | env | all). Default: session.
2. Read catalog/watchdog/dig.md and follow it: verify every finding against this repo before proposing anything; present findings most-severe-first with evidence and a concrete proposal.
3. For steering/guardrail findings, make the edits yourself (navigation pointers; deterministic checks over prose rules). For mechanical reclamation, call `watchdog fix` — dry-run first, `--apply` only after I confirm.
4. Close the loop: mark what changed with `watchdog fix --finding <id> --apply` (or --dismiss).
