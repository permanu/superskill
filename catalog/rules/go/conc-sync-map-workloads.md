---
id: go-conc-sync-map-workloads
lang: go
prefix: conc
title: Use sync.Map only for write-once or disjoint-key workloads; otherwise use a map with a mutex
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sync.Map, map, contention, cache, mutex]
  files: ["**/*.go"]
  symbols: [sync.Map]
related: [go-conc-mutex-map]
sources:
  - title: Package sync - Map
    url: https://pkg.go.dev/sync
  - title: Package sync/atomic
    url: https://pkg.go.dev/sync/atomic
---
> Reach for sync.Map only when the documented access patterns apply.

## Why

The sync package says most code should use a plain map with separate locking, for type safety and easier invariants; sync.Map pays off only when a key is written once and read many times, or when goroutines read, write, and overwrite entries for disjoint key sets. A shared hot counter is the opposite shape: all goroutines contend on the same key, where a single mutex is simpler and faster.

## Bad

```go
var counters sync.Map

func hit(key string) {
    v, _ := counters.LoadOrStore(key, new(atomic.Int64))
    v.(*atomic.Int64).Add(1)
}
```

## Good

```go
var (
    mu       sync.Mutex
    counters = map[string]int{}
)

func hit(key string) {
    mu.Lock()
    counters[key]++
    mu.Unlock()
}
```

## See Also

- [go-conc-mutex-map](conc-mutex-map.md) - the default map-plus-mutex pattern
