# Core concepts

## Constitution

`catalog/constitution.md` holds the T0 axioms — always-on principles such as evidence-before-done, parse-at-boundaries, no-secrets, and verified-only injection. Each axiom names the mechanism that enforces it (gate check, validator, security scanner, router, review). The harness hook can inject it at session start; it is not something you load manually.

## The Plan

`superskill` never dumps rules. A deterministic router builds a plan from explicit keys:

- **Language scope** — project stack, task words, and the extensions of the `files` you pass. Rules for other languages are not eligible.
- **Phase** — inferred from the task: `deploy`/`release`/`ship` → ship, `review`/`refactor`/`audit`/`diff` → review, `add`/`build`/`create`/`implement` → implement, `brainstorm`/`plan`/`design` → explore.
- **Eligibility** — only `status: verified` rules by default; drafts are pull-only.
- **Ranking** — severity (`must` → `should` → `prefer`), then score (file match 100, keyword 10, symbol 1), then rule id.
- **Budget** — a phase-sized token budget; rules that do not fit are reported in `dropped`, never silently cut.
- **Explain** — every selection carries the keys that matched it.

The response's `rules_plan` is the audit trail: `selected`, `explain`, `dropped`, `budget`.

## Flows

Plans carry a `flows` slot for named multi-step procedures alongside the rule set. The enforced flow today is the gate pipeline — spec → tickets → evidence → gate check — where every step is a command with a deterministic outcome.

## Gates

Work is not "done" because a model says so. The gate pipeline is:

1. **Spec** — a fixed skeleton (goal, non-goals, constraints, context, files, acceptance, risks, rollback). Approve requires zero gaps; freeze pins a content hash and makes the spec immutable.
2. **Tickets** — derived from a frozen spec. Each ticket carries acceptance criteria (each needs a command or a manual reason), `blocked_by`, an optional review requirement, and an evidence slot.
3. **Evidence** — appended per ticket with command, exit code, truncated output, commit, and timestamp.
4. **Gate check** — deterministic pass/fail on a spec or ticket, exiting non-zero on failure. No LLM in the loop.

## Code graph

A deterministic, local-only code graph built with tree-sitter WASM. No LLM, no network, no native modules. Every edge is tagged **EXTRACTED** (read directly from an AST) or **INFERRED** (resolved by a rule or heuristic), so verification can restrict itself to facts that are true by construction. Use it through `impact` and `claims`.

## Vault

Markdown under `~/Vaults/ai/projects/<slug>/` is the source of truth. SQLite FTS5 + an edges table is a derived index (porter stemming: `authorize` hits `Authorization`); the `write` tool updates it incrementally, and `graph rebuild` rebuilds it from markdown (run it after batch or out-of-band edits). The project is auto-detected from the current directory (git root + `project-map.json`); override with `--project`.

## Project isolation

- Vault IO is jailed to `projects/<slug>/`. Sibling projects are denied.
- `search` and `graph cross-project` stay inside the current slug — cross-project search is denied, not just discouraged.
- `VAULT_PATH` must resolve under your home directory.
- Secret-like writes throw `SECRET_REJECTED` before touching disk.
- `.superskill/` is per-developer and gitignored.

## Packs

| Pack | When |
|------|------|
| `pipeline/delivery` + `norms` | Always. Diagnose, then load a combination — not a 10-step ritual |
| `optimizer/algorithm` | Always. Invariant, O(…), HLD/LLD that pay rent |
| `optimizer/adhd` `pipeline/lazy-build` | Output contract (terse, action-first) and build ladder (reuse → minimal) — deep dives under the always-on norms |
| `memory/graph` | Always (tiny). This project's vault only |
| `security/index` | Tiny always-on. Full `compliance` on audit / OWASP / security bugs |
| `code/<lang>` | This repo's stack, or the task names a language |
| `review/architect` | Review / diff / security fix — 18 axes |
| `pipeline/plan` `tdd` `verify` `investigate` `qa` | Spec, TDD, evidence-before-done, debug, markdown-output QA |
| `devops/cloud` `devops/sre` | Deploy / SLO / incident — the cloud this repo already uses |
| `watchdog/dig` `watchdog/fix` | Session review + environment optimization — dig for findings, fix what you approve |

skills.sh remains **opt-in install** (`skill install`), not the default catalog.
