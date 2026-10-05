---
id: go-mem-sync-pool
lang: go
prefix: mem
title: Reuse hot temporary buffers with sync.Pool, not a custom free list
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sync.Pool, buffer, allocation, GC]
  files: ["**/*.go"]
  symbols: [sync.Pool]
related: [go-mem-pass-values, go-conc-goroutine-lifetime]
sources:
  - title: Package sync - Pool
    url: https://pkg.go.dev/sync
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Cache temporary buffers in a sync.Pool instead of a hand-rolled free list.

## Why

The sync package describes Pool as caching allocated but unused items to relieve garbage-collector pressure, and warns it is not suitable for every free list. A mutex-guarded stack of buffers is the same idea with more code, and it holds every buffer forever, while a Pool may drop items at any collection. The zero-value buffer pattern with a New function makes reuse a two-line change.

## Bad

```go
var (
    mu  sync.Mutex
    buf []*bytes.Buffer
)

func getBuf() *bytes.Buffer {
    mu.Lock()
    defer mu.Unlock()
    if n := len(buf); n > 0 {
        b := buf[n-1]
        buf = buf[:n-1]
        return b
    }
    return new(bytes.Buffer)
}
```

## Good

```go
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}

func getBuf() *bytes.Buffer { return bufPool.Get().(*bytes.Buffer) }
```

## See Also

- [go-mem-pass-values](mem-pass-values.md) - passing buffers without extra indirection
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - pools are safe for concurrent use
