---
id: go-conc-typed-atomics
lang: go
prefix: conc
title: Use the typed sync/atomic values instead of the raw functions
severity: prefer
enforce: tool
tool: go fix:atomictypes
baseline: latest
status: verified
triggers:
  keywords: [atomic, sync/atomic, counter, alignment]
  files: ["**/*.go"]
  symbols: [atomic.Int64, atomic.Bool, atomic.Pointer]
related: [go-conc-atomics-not-locks, go-conc-mutex-defer-unlock]
sources:
  - title: Package sync/atomic - Typed values
    url: https://pkg.go.dev/sync/atomic
  - title: Go Release Notes - go fix modernizers
    url: https://go.dev/doc/go1.27
---
> Declare atomic.Int64, atomic.Bool, or atomic.Pointer instead of calling atomic.AddInt64 on a plain field.

## Why

The typed wrappers keep the atomic value self-describing and make every operation a method, so a plain read cannot be mistaken for a safe one. The package documentation recommends them as more ergonomic and less error-prone, particularly on 32-bit platforms where a bare 64-bit field can be misaligned for atomic access. The atomictypes modernizer rewrites the old function form automatically.

## Bad

```go
type hits struct {
    n int64
}

func (h *hits) inc() {
    atomic.AddInt64(&h.n, 1)
}
```

## Good

```go
type hits struct {
    n atomic.Int64
}

func (h *hits) inc() {
    h.n.Add(1)
}
```

## See Also

- [go-conc-atomics-not-locks](conc-atomics-not-locks.md) - when an atomic is the wrong tool entirely
- [go-conc-mutex-defer-unlock](conc-mutex-defer-unlock.md) - the locking alternative for compound updates
