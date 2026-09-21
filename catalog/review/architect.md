---
name: architect
pack: review
always: false
triggers: [review, pr, diff, architect, techlead, greptile, coderabbit, nits, regression]
---

# Multi-axis review (no skipped axis)

Not dual-axis. Every missed axis is a missed class of bug. Walk **all** axes that the diff can touch. If an axis does not apply, write `n/a: <one reason>`. Silence is not n/a.

Load vault first: `project_context`, `resume`, `search` this project. Diff **and** every caller of a changed symbol.

Output one line per finding: `path:line: axis: severity: problem. fix.`
`blocker` = wrong, leak, data loss, authz hole. `high` = untested branch, race, O(n²) as n grows. Style only if it hides a bug.

## Axes (all of them)

### 1. Spec / intent
Does the diff match the asked invariant and vault ADRs? Extra flags and dead code are findings. Spec-wrong is a blocker even if tests pass.

### 2. Callers / blast radius
Every caller of a changed function. A guard on one path that siblings skip is a bug. Include CLI, MCP, tests, and jobs.

### 3. Algorithmic correctness
Empty, one, duplicates, overflow, unicode, unordered input, idempotent replay. Wrong on an edge is a blocker. Name O(time)/O(space). Slower algorithm only with a reason.

### 4. Concurrency
Shared mutable, missing await, lock across await, double-check without memory ordering, lost updates, duplicate jobs. Timeouts on outbound IO.

### 5. Errors / data loss / rollback
What happens on throw mid-write? tmp+rename or equivalent. Catch blocks that swallow `EACCES`/`EISDIR`. Can this be reverted?

### 6. Trust / authz / tenancy
Every ID fetch tenant-scoped. Authz on every mutating path. Default deny. No `exec` with a shell. Untrusted input at the boundary.

### 7. Secrets / PII / privacy
No keys, tokens, or `.env` in git, vault, logs, or skill content. PII minimization, retention. Creds as `cred_refs` only.

### 8. Injection / parsers
SQL/command/template/path. Bound parameters. Path jail (`VaultFS`). YAML/JSON from users: deny unknown where it matters.

### 9. API / contract
Breaking change to CLI flags, MCP tool schemas, JSON fields, HTTP? Version or document. Status codes, pagination, idempotency keys.

### 10. Persistence / migrations
Schema expand-then-contract. Backfill. Dual-write drift. Index vs markdown SoT (if they disagree, markdown wins — finding if code assumes the index is truth).

### 11. Resource lifecycle
Open files, DB handles, servers, timers, child processes. Close/abort on failure. No leaked goroutines / intervals.

### 12. Time / clocks / ordering
Timezone, monotonic vs wall, lease TTL, session expiry, “now” in tests. Replay and exactly-once vs at-least-once.

### 13. Dependencies / supply chain
New package: need, license, audit. Pin. No install for a one-liner. Skill audits `fail` stay blocked.

### 14. Observability
Enough to reconstruct authz failures. No secrets in logs. Metrics for the golden signals of this change.

### 15. Tests / evidence
One check that fails if the new branch is wrong. No generated theater. UI: harness `qa viz` if HTML changed. Do not approve without a command result.

### 16. Operability / ship
Feature flag, config, rollback, migrate. Who gets paged? Fail closed on authz.

### 17. UI / a11y (if UI)
Keyboard, labels, contrast, XSS in the new surface. Canvas/HTML: nodes must be clickable (`data-qa`), not canvas-only.

### 18. HLD / LLD
Name the owner: vault, index, router, catalog, CLI. New pattern with one implementation is a finding. No second orchestrator.

## After
If the system model changed: `learn add`. Hand off to `security/compliance` when axes 6–8 moved, to `devops/sre` when 14–16 moved. Do not rubber-stamp.
