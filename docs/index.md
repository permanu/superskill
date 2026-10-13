# SuperSkill documentation

These guides are the manual — installation, every command and MCP tool, workflows, and the safety model. The [README](../README.md) is the hub: what the project does, a quick start, and pointers back here.

| Guide | What it covers |
|---|---|
| [Getting started](getting-started.md) | Install, first run, MCP configuration per client, upgrade, uninstall |
| [Concepts](concepts.md) | Constitution, the plan, flows, gates, code graph, vault, project isolation, packs |
| [Commands](commands.md) | Full CLI reference: vault, project memory, knowledge graph, skills, gates, code graph, setup, telemetry, hygiene, watchdog |
| [MCP tools](mcp-tools.md) | The MCP tool surface and its parameters |
| [Workflows](workflows.md) | Gates walkthrough (spec → tickets → evidence → gate) and rule planning |
| [Knowledge graph](knowledge-graph.md) | Vault FTS + edges, lazy traversal, code-graph impact/claims, confidence model |
| [Obsidian](obsidian.md) | Viewing your memory: `graph viz`, the project dashboard, Bases views, graph scoping |
| [Worktrees](worktrees.md) | Worktree cache sharing: usage, safety, CLI reference, troubleshooting |
| [Space hygiene](hygiene.md) | Read-only space report across caches, worktrees, docker, xcode, scratch |
| [Watchdog](watchdog.md) | Session review and environment optimization |
| [Configuration](configuration.md) | Environment variables and harness hooks |
| [Security](security.md) | Vault jail, secret scanner, audit gate, prompt-injection scan, rate limits |
| [Harness integration](harness.md) | Client setup matrix, support contracts, hooks, CI |
| [Diagram conventions](diagram-conventions.md) | Rules for the generated architecture diagrams (HLD/LLD/DFD/ERD) |

Authoring references:

| Doc | What it covers |
|---|---|
| [Rule contract](authoring/CONTRACT.md) | One falsifiable decision per file, primary sources, compilable Bad/Good snippets |
| [Code graph model](authoring/codegraph.md) | Full code-graph data model and per-language limits |
| [Validator](authoring/validator.md) | How the rules validator checks the catalog |
| [Skill template](SKILL-TEMPLATE.md) | Template for authoring skills |
