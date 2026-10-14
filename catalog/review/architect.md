---
name: architect
pack: review
always: false
triggers: [review, pr, diff, architect, techlead, greptile, coderabbit, nits, regression, defects, defect, critique, entire project, codebase audit, quality]
---

# Multi-axis review (no skipped axis)

This is an agent review checklist, not an automated 18-axis analyzer or a security certification. Routing this skill does not execute its checks. Record what was inspected, what ran, and what remains unknown; do not claim an axis passed because this prompt was loaded.

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
No keys, tokens, or `.env` in git, vault, logs, skill content, or published artifacts. Raw prompts, transcripts, paths, and project content need an explicit collection purpose, consent boundary, and retention policy. Test opt-out and redaction paths. Creds as `cred_refs` only.

### 8. Injection / parsers
SQL/command/template/path. Bound parameters. Jail user paths. YAML/JSON from users: deny unknown where it matters.

### 9. API / contract
Breaking change to CLI flags, MCP tool schemas, JSON fields, HTTP? Version or document. Status codes, pagination, idempotency keys.

### 10. Persistence / migrations
Schema expand-then-contract. Backfill. Dual-write drift. If two stores can disagree, name which is source of truth.

### 11. Resource lifecycle
Open files, DB handles, servers, timers, child processes. Name the owner and who may close, overwrite, or remove each resource; another session's checkout, lock, or cache is not disposable. Bound bytes, queues, concurrency, retries, and wall time at the consuming boundary, including streamed or cached input. Close/abort on failure and cancellation. No leaked goroutines / intervals.

### 12. Time / clocks / ordering
Timezone, monotonic vs wall, lease TTL, session expiry, “now” in tests. Replay and exactly-once vs at-least-once.

### 13. Dependencies / supply chain
New package: need, license, audit. Verify action commits against upstream refs; pin downloaded executable bytes to reviewed in-repo digests, not first-use cache manifests. Check cached bytes too and reject mismatches. No install for a one-liner. Skill audits `fail` stay blocked.

### 14. Observability
Enough to reconstruct authz failures. No secrets in logs. Metrics for the golden signals of this change.

### 15. Tests / evidence
One check that fails if the new branch is wrong. No generated theater. UI: inspect actual browser/harness evidence when available. Run `graph viz` only when generated-note output changed or the user explicitly requested it; inspect actual outputs rather than assuming fixed counts. Do not approve without a relevant command result.

### 16. Operability / ship
Feature flag, config, rollback, migrate. Who gets paged? Fail closed on authz.

### 17. UI / a11y (if UI)
Keyboard, labels, contrast, XSS in the new surface.

### 18. HLD / LLD
Name the owner module in this repo. New pattern with one implementation is a finding. No second framework “for later.”

## Targeted regression checklist

For each applicable risk, cite a focused command and its result; otherwise record `n/a` with a reason. These are reviewer obligations, not checks this skill runs automatically.

- Privacy: an opted-out or unauthorized operation emits no prompt, transcript, credential, or project content; inspect the actual package/log/output boundary.
- Ownership: a foreign project/session, symlink, stale lock, or unrelated file remains untouched when the operation is refused or cleaned up.
- Bounded resources: oversized declared and streamed input, stalled IO, cancellation, full queues, and repeated attempts stop at the named byte/time/admission limit without leaving partial state.
- Supply chain: corrupt fresh and cached executable assets are rejected before use; an extra unverified asset cannot enter a wildcard load path.
- Release: hostile tag text cannot become shell source, changelog matching is literal, and release metadata agrees with the package version.
- Preservation: the nearest valid operation still succeeds, and the regression fails against the prior mechanism. State any toolchain or integration gap instead of treating a skip as proof.

## After
If a specific decision remains unresolved, state the missing fact, why code/tests/repository evidence cannot settle it, and which change depends on the answer; then use `pipeline/grill`. An applicable axis or a check that has not run is not itself a decision. Complete independent review work and report evidence gaps without claiming a pass.

If the system model changed: `learn add`. Hand off to `security/compliance` when axes 6–8 moved, to `devops/sre` when 14–16 moved. Do not rubber-stamp.
