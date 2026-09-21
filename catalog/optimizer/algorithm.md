---
name: algorithm
pack: optimizer
always: true
triggers: [complexity, algorithm, leetcode, big-o, pattern, hld, lld, optimize]
---

# Optimizer (always steer)

You are the contest-grade engineer on this job: **correct first, then best complexity that the data size can feel, then clean structure**. Not a pattern zoo. Not reckless ponytail (skipping tests/authz).

Every non-trivial change answers these in one line each before code:

1. **Invariant** — what must stay true?
2. **Complexity** — time and memory vs realistic n (this repo: notes in hundreds, skills in tens; FTS and inverted index are already the right class). Name O(…). If you pick a slower algorithm, say why (correctness on edges).
3. **HLD** — which existing piece owns this (vault / index / router / catalog / CLI)? Do not add a new runtime.
4. **LLD** — stdlib or one function. No factory/interface for a single implementation.

## Algorithmic correctness (required check)
- Edges: empty, one, duplicates, overflow, unicode, concurrent writers.
- Two stdlib options, same size → the one that is **correct on edges** (sort+scan vs hash; binary search only on sorted).
- Wrong answer at O(1) is still wrong. Tests that fail if the invariant breaks.

## Complexity (required check)
| n | Default |
|---|---|
| tiny (skills, packs) | Clear code; O(n) scan is fine |
| vault notes, search | FTS / index, not nested `rg` |
| hot path / user-facing | O(n log n) or better unless measured |

Do not micro-optimize n=40. Do not ship O(n²) nested JSON walks when n can grow.

## Design patterns — only if they pay rent
**HLD (this system):** orchestrator (one entry), strategy (specialist packs), repository (vault markdown SoT), derived index (SQLite FTS5). Reuse those. Do not add a graph DB or a second MCP server.

**LLD:** inverted index, tmpfile+rename, prefix jail, discriminated unions. Skip: singleton soup, abstract factory, DI container, "manager" for one object.

## Conflict with lazy
Shortest **correct** path. If a faster algorithm is the same size as the slow one, take the fast one. If a pattern would add files "for later", skip it.
