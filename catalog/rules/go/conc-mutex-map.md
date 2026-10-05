---
id: go-conc-mutex-map
lang: go
prefix: conc
title: Guard built-in maps with a mutex; concurrent writes crash the program
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, mutex, data race, concurrent write, sync]
  files: ["**/*.go"]
  symbols: [sync.Mutex, make]
related: [go-conc-sync-map-workloads, go-conc-mutex-defer-unlock]
sources:
  - title: Go FAQ - Why are map operations not defined to be atomic?
    url: https://go.dev/doc/faq
  - title: Package sync - Map
    url: https://pkg.go.dev/sync
---
> Protect every concurrent map write with a mutex or use sync.Map.

## Why

Map operations are not atomic by design; concurrent writes are detected at runtime and terminate the program with a fatal error. The FAQ explains that the typical map is already protected by surrounding synchronization, so the runtime does not pay for a lock on every access. A plain map with a Mutex is the default; sync.Map is reserved for specific access shapes.

## Bad

```go
func count(words []string) map[string]int {
    m := make(map[string]int)
    var wg sync.WaitGroup
    for _, w := range words {
        wg.Add(1)
        go func() {
            defer wg.Done()
            m[w]++
        }()
    }
    wg.Wait()
    return m
}
```

## Good

```go
func count(words []string) map[string]int {
    m := make(map[string]int)
    var mu sync.Mutex
    var wg sync.WaitGroup
    for _, w := range words {
        wg.Add(1)
        go func() {
            defer wg.Done()
            mu.Lock()
            m[w]++
            mu.Unlock()
        }()
    }
    wg.Wait()
    return m
}
```

## See Also

- [go-conc-sync-map-workloads](conc-sync-map-workloads.md) - when sync.Map beats a mutex
- [go-conc-mutex-defer-unlock](conc-mutex-defer-unlock.md) - releasing the lock on every path
