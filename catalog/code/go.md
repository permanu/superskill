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
