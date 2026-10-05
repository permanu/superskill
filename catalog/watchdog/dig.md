---
name: dig
pack: watchdog
always: false
triggers: [watchdog, dig, session review, retro, bloat, stale, unused, agent environment, cleanup, session audit]
---

# Watchdog dig

Find what is costing the next session time, tokens, or trust. Evidence first, judgment second.

## Run

Call the `watchdog` tool with action `dig`:

- `scope: session` (default) — latest session, or pass `session_id`
- `scope: window` — last 7 days, or pass `since` / `count`
- `scope: env` — machine + repo environment
- `scope: all` — window + env together

The tool returns deterministic findings (each with id, evidence, proposal) plus compact session digests.

## Verify before proposing

For every finding, open the cited file, command, or config in this repo and confirm it. The codebase is the source of truth; the trace is only a claim. Drop anything you cannot reproduce — a wrong finding costs more than a missed one.

## Judgment pass

Classify each surviving finding and pick the intervention the taxonomy forces:

- **Mechanical** violation (fixed pattern, banned API, import shape, file location) → deterministic check: lint rule, hook, or CI job. Never a prose rule.
- **Missing feedback loop** → information access, or a check that goes red on the mistake.
- **Navigation cost** → one-line pointer in AGENTS.md to the doc that holds the detail. AGENTS.md stays pointers-only.
- **Steering no-op / duplication / staleness** → delete or merge; apply the writing-for-agents pruning tests.
- **Stale skill, rule, or plugin** → sharpen the trigger or remove it.
- **Misalignment** (user corrected course repeatedly) → propose a grill/spec pass before the next run of this kind.
- **Verification gap** → wire the repo's own check command into a hook or CI.

## Present

Most severe first: correctness risk > spend/time > hygiene. One block per finding — what happened (evidence), why it cost (impact), what to change (target + patch). Name the exact file to edit.

## Close

Apply what the user approves. Mark outcomes with `watchdog fix --finding <id> --apply` or `--dismiss`.

Completion: every finding is verified, classified, and either applied, dismissed, or explicitly left open.
