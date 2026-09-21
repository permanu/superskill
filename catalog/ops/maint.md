---
name: maint
pack: ops
always: false
triggers: [init, prune, graph, onboard, deprecate, snapshot, rollback]
---

# Ops

- `init`: detect stack, index **catalog** skills + project-local skills. Do not scrape skills.sh.
- `prune` / `deprecate`: dry-run first. Graph writes are tmpfile + rename.
- Graph and local context live in project `.superskill/` and are **gitignored**. Each developer keeps their own trajectory. `init` appends `.superskill/` to `.gitignore` if missing.
