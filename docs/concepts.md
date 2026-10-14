# Core concepts

## Constitution

`catalog/constitution.md` holds optional T0 guidance, including evidence-before-done, parse-at-boundaries, and no-secrets. It is not universally injected: a configured session-start hook can emit it, or a host can explicitly open the `constitution` graph node. It applies when actually present in context; it is not an automatic background policy. Each item names its enforcement mechanism (gate check, validator, security scanner, router, review).

## The Plan

`superskill` never dumps rules. A deterministic router builds a plan from explicit keys:

- **Language scope** — project stack, task words, and the extensions of the `files` you pass. Rules for other languages are not eligible.
- **Phase** — explicit or inferred from the task. It selects methodology packs and the content budget, and labels the rule plan; it does not filter individual rules, which have no phase-eligibility metadata.
- **Eligibility** — only `status: verified` rules by default; drafts are pull-only.
- **Ranking** — severity (`must` → `should` → `prefer`), then score (file match 100, keyword 10, symbol 1), then rule id.
- **Budget** — a phase-sized token budget; rules that do not fit are reported in `dropped`, never silently cut.
- **Explain** — every selection carries the keys that matched it.

The response's `rules_plan` is the audit trail: `selected`, `explain`, `dropped`, `budget`.

## Flows

Plans reserve `flows` and `gates` slots for compatibility; both are currently empty. The router does not execute procedures or evidence gates. Run the separate spec → tickets → evidence → gate check commands explicitly when using that workflow.

## Gates

Work is not "done" because a model says so. The gate pipeline is:

1. **Spec** — a fixed skeleton (goal, non-goals, constraints, context, files, acceptance, risks, rollback). Approve requires zero gaps; freeze pins a content hash and makes the spec immutable.
2. **Tickets** — derived from a frozen spec. Each ticket carries acceptance criteria (each needs a command or a manual reason), `blocked_by`, an optional review requirement, and an evidence slot.
3. **Evidence** — appended per ticket with command, exit code, truncated output, commit, and timestamp.
4. **Gate check** — deterministic pass/fail on a spec or ticket, exiting non-zero on failure. No LLM in the loop.

## Code graph

A deterministic, local-only code graph built with tree-sitter WASM. No LLM, no network, no native modules. Every edge is tagged **EXTRACTED** (read directly from an AST) or **INFERRED** (resolved by a rule or heuristic). Scans respect Git ignore rules and resource budgets; incomplete parsing or binding coverage is not evidence of absence. Negative claims without sufficient edge evidence return `unverifiable`, not a promise of complete interprocedural analysis. Use it through `impact` and `claims`.

## Vault

Markdown under `~/Vaults/ai/projects/<slug>/` is the source of truth. SQLite FTS5 + an edges table is a derived index (porter stemming: `authorize` hits `Authorization`); the `write` tool updates it incrementally, and `graph rebuild` rebuilds it from markdown (run it after batch or out-of-band edits). The project is auto-detected from the current directory (git root + `project-map.json`); override with `--project`.

Notes with `inject: always` are collected only from `projects/<slug>/shared/`, including full context mode. Vault-root `shared/` is not injected into project contexts.

## Project isolation

- Vault IO is jailed to `projects/<slug>/`. Sibling projects are denied.
- `search` and `graph cross-project` stay inside the current slug — cross-project search is denied, not just discouraged.
- `VAULT_PATH` must resolve under your home directory.
- Secret-like writes throw `SECRET_REJECTED` before touching disk.
- `.superskill/` is per-developer and gitignored.

## Packs

Internal pack IDs (for example, `pipeline/delivery`) and atomic rule files use SuperSkill's routing and rule contracts. They are not native `SKILL.md` files and do not need to meet native skill metadata rules. Use the [native skill template](SKILL-TEMPLATE.md) and explicit `skill validate` profile for native skills; a structural pass does not establish model behavior quality or cross-host compatibility.

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
