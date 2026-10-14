---
name: maint
pack: ops
always: false
triggers: [init, prune, graph, onboard, deprecate, snapshot, rollback]
---

# Ops

- `init`: detect stack, index **catalog** skills + project-local skills. Do not scrape skills.sh.
- `prune`: inspect the supported preview before mutation; do not infer flags from another command.
- `deprecate`: inspect the target and its references first. This command has no dry-run flag; show the exact path and reason, then require explicit approval before writing.
- Watchdog dismissal changes stored state. Inspect the exact report and finding first, and dismiss only when the user explicitly requests that finding be dismissed. After approval, the CLI mutation is exactly `superskill watchdog fix --finding <id> --dismiss --apply` (MCP: `action: "fix", dismiss: true, apply: true`). Never add `apply` before approval.
- Graph writes are tmpfile + rename.
- Graph and local context live in project `.superskill/` and are **gitignored**. Each developer keeps their own trajectory. `init` appends `.superskill/` to `.gitignore` if missing.
