---
description: superskill worktree cache shortcuts (status/audit/gc)
---
<!-- superskill:command -->
Use the superskill worktree MCP tools. Input: $ARGUMENTS (empty = status).

- status → `worktree_status`
- audit / duplicates / leaks → `worktree_audit` (read-only)
- gc / free space → `worktree_gc` dry-run first; pass confirm=true only after I approve.

Never deletes worktrees, branches, or user files; reclaims are quarantined and reversible.
