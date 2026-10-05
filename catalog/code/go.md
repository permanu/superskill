---
name: go
pack: code
langs: [go]
triggers: [go, golang, goroutine, context, errgroup]
---

# Go (staff)

- `error` values, wrap with `%w`. Sentinel vs `%w` is a choice — pick one per package and stick to it.
- Context on every IO and RPC. Do not store `context.Context` on a struct.
- Goroutine only with a stop path (`ctx.Done()`, `errgroup`). No leaked workers.
- Small interfaces at the **consumer**. Tables in tests. No business logic in `init()`.
- `database/sql` with bound args. No string-built SQL.

## When
Repos that already are Go. Do not add a Go service beside a working Node one.

## Worktree & caches
- `GOCACHE` and `GOMODCACHE` are user-global and concurrent-safe by design; sharing them across worktrees is the default and correct behavior.
- The duplication vector is an isolated `HOME` (containers, CI, agent sandboxes): point `GOCACHE`/`GOMODCACHE` at the shared cache root there.
- Never place `GOCACHE`/`GOMODCACHE` inside the repo — it pollutes git status and defeats sharing.
- Append `GOFLAGS=-trimpath` (never replace existing flags) so own-package builds stay cacheable across differing worktree paths.
- `go clean -cache` is user-global: it invalidates every worktree's builds, so run it deliberately.
