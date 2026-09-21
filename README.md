# SuperSkill

One-entry orchestrator for coding agents. Curated packs, project-jailed vault, FTS knowledge graph. Not a dump of 90k remote skills.

[![npm](https://img.shields.io/npm/v/superskill)](https://www.npmjs.com/package/superskill)
[![license](https://img.shields.io/badge/license-AGPL--3.0-blue)](https://www.gnu.org/licenses/agpl-3.0)

Prompt normally. Call **`superskill`** with the task. It diagnoses, then delegates (Go → Go pack, QA → QA, security bug → review + security). Defaults: ADHD-shaped output, careful-minimal code, algorithm-correct. Review walks **18 axes** (`n/a: reason` required). Factory packs (plan, TDD, verify, SRE) are **ours**, learned from Superpowers / Matt Pocock / Google+Cloudflare — not their repos vendored in.

Requires **Node 22+** (`node:sqlite`).

## Why

Marketplace skill dumps fill the window with advice that does not know *this* system. Review and security need:

- **Vertical** — this project’s ADRs, learnings, sessions
- **Horizontal** — callers, sibling paths, co-activations
- **Fresh** — session complete + `learn`

SuperSkill injects a system brief from the project graph, jails vault IO to `projects/<this-slug>/`, and keeps `.superskill/` **gitignored** so each developer’s trajectory stays private.

## How it works

1. `npx superskill-cli init` — detect stack, index the **in-repo catalog** (not skills.sh)
2. Describe the task
3. Inverted-index router picks packs (language, phase, specialists)
4. Content is budgeted. Real review/diff/audit (and security bugs) get the vault + caller protocol
5. Activations write `.superskill/graph.json` (local only)

## Packs

| Pack | When |
|------|------|
| `pipeline/delivery` + `norms` | Always. Diagnose, then load a combination — not a 10-step ritual |
| `optimizer/algorithm` | Always. Invariant, O(…), HLD/LLD that pay rent |
| `memory/graph` | Always (tiny). This project’s vault only |
| `security/index` | Tiny always-on. Full `compliance` on audit / OWASP / security bugs |
| `code/<lang>` | This repo’s stack, or the task names a language |
| `review/architect` | Review / diff / security fix — 18 axes |
| `pipeline/plan` `tdd` `verify` `investigate` `qa` | Spec, TDD, evidence-before-done, debug, Chrome QA |
| `devops/cloud` `devops/sre` | Deploy / SLO / incident — the cloud this repo already uses |

skills.sh remains **opt-in install**, not the default catalog.

## Knowledge graph

Markdown under `projects/<slug>/` is source of truth. SQLite FTS5 + `edges` is a derived index (porter stems: `authorize` hits Authorization).

```bash
npx superskill-cli graph rebuild -p my-project
npx superskill-cli graph viz -p my-project
npx superskill-cli qa viz -p my-project
```

Open **one** file: `projects/<slug>/knowledge-graph.html`

Tabs: **Graph · HLA · LLA · ERD · Modules**. Keys `g` `h` `l` `e` `m`. Vault / index panels list **what is actually stored** (titles + text), not empty blobs. Obsidian: vault root = `VAULT_PATH`, open `knowledge-graph.canvas`.

QA drives **system Chrome** via `playwright-core` (in-harness, not a plugin).

## Isolation

- Vault IO jailed to `projects/<slug>/`. Sibling projects denied
- Secret-like writes throw `SECRET_REJECTED`
- Search stays in this slug
- `.superskill/` is appended to `.gitignore` on `init`

## Quick start

```bash
npm install -g superskill
# in the repo
npx superskill-cli init
```

MCP (prefer the installed binary, not `npx -y`, so you get this version):

```json
{
  "mcpServers": {
    "superskill": {
      "command": "superskill",
      "env": { "VAULT_PATH": "~/Vaults/ai" }
    }
  }
}
```

Claude Code plugin: `/plugin marketplace add permanu/superskill` then `/plugin install superskill`.

Then prompt normally and call the `superskill` tool with the task.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_PATH` | `~/Vaults/ai` | Knowledge vault (must be under `$HOME`) |
| `MAX_INJECT_TOKENS` | `1500` | Max tokens for context injection |
| `SESSION_TTL_HOURS` | `2` | Session heartbeat TTL |
| `CHROME_PATH` | macOS Chrome | Browser used by `qa viz` |

## License

AGPL-3.0-or-later — [LICENSE](./LICENSE)

Copyright 2026 Permanu (Atharva Pandey)
