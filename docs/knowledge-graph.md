# Knowledge graph

Derived indexes and routing history, one project scope.

## Vault FTS + edges

Markdown is the source of truth; `projects/<slug>/.knowledge-index.sqlite` is a derived FTS5 index with an edges table (frontmatter `related` + `[[wikilinks]]`). It is rebuilt on write and by `graph rebuild`. `graph related <path>` reads backlinks/outgoing links from the index (`--hops` for traversal depth).

## Lazy traversal (agent access)

Don't load catalog dumps — resolve first, open last:

```bash
superskill graph resolve "fix a rust ownership bug"   # paths + byte/token estimates, no content
superskill graph children rules:rust                  # descend one level (rules → lang → prefix)
superskill graph node rule:rust-own-cow-conditional   # metadata + edges
superskill graph open rule:rust-own-cow-conditional   # pull just this file (cap ~4KB, --full for all)
```

Ids span every artifact: `vault:<path>`, `skill:<pack/name>`, `rule:<id>`, `code:<path>`, and opaque `symbol:<id>` values returned by file children or task resolution. The MCP equivalent is one tool: `graph_traverse` (`action: resolve|children|node|open`). Resolve and children return metadata without source bodies. Open defaults to 4,096 UTF-8 bytes; opening a symbol returns its source span rather than its whole file.

The storage boundaries are deliberate: Markdown is project memory, SQLite derives searchable note links, the source parser derives code relationships, and the project-local skill graph records routing and session outcomes. Traversal presents these through one metadata interface; visualization is a generated consumer, not a prerequisite for agent retrieval.

For methodology content, the `superskill` MCP tool returns a compact result by default. Set `max_tokens` (256–50,000) to bound estimated content tokens, and `detail: "full"` only when routing diagnostics are needed. The compact response reports content and complete serialized-response estimates separately; these are heuristic estimates, not tokenizer measurements. The CLI exposes the same behavior:

```bash
superskill skill activate "review parser boundaries" --max-tokens 1500 --json
superskill skill activate "review parser boundaries" --max-tokens 1500 --json --detail full
```

Pass the registered coordination `session_id` (CLI `--session-id`) during activation so completion learns only from that session. Unrelated tasks no longer share a graph session merely because they run close together. Graph mutations, coordination updates, and vault read–modify–write operations use exclusive locks. Concurrent note updates read the latest content under the lock and replace the file atomically. A crashed owner can leave a lock behind: a timeout names the exact path; confirm the owner has stopped before removing that lock and retrying. Live locks are never stolen based on age alone.

## Code graph: impact and claims

```bash
superskill impact src/lib/codegraph/scan.ts
superskill impact Reporter --to normalize
superskill claims -c '[{"kind":"symbol-exported","name":"Reporter","file":"src/lib/codegraph/query.ts"}]'
```

`impact` returns EXTRACTED definitions, importers, INFERRED callers, and the shortest graph path between two targets. `claims` verifies structured claims (`file-exists`, `symbol-exists`, `symbol-exported`, `import-resolves`, `no-other-importers`, `no-other-callers`) and returns `verified` / `refuted` / `unverifiable` with node ids and edge confidence; it exits non-zero when any claim is refuted.

## Confidence model

| Edge | Confidence | Why |
|---|---|---|
| `defines` | EXTRACTED | lexical containment in the AST |
| `imports` module → imported specifier | EXTRACTED | the import statement names it |
| `exports` | EXTRACTED | export modifier read from the AST |
| `imports` module → module | INFERRED | specifier resolution (path heuristics) |
| `references` | INFERRED | identifier use resolved by name |
| `calls` | INFERRED | callee resolved by name |

Verification should only trust EXTRACTED edges — they are exactly what the AST states. Resolution-derived knowledge is INFERRED and may be wrong for overloads, shadowing, or name collisions. See [the code graph model](authoring/codegraph.md) for the full data model and per-language limits.
