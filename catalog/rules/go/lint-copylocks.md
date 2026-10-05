---
id: go-lint-copylocks
lang: go
prefix: lint
title: Never pass a value that contains a mutex
severity: must
enforce: tool
tool: go vet:copylocks
baseline: latest
status: verified
triggers:
  keywords: [mutex, copy, copylocks, vet]
  files: ["**/*.go"]
  symbols: [sync.Mutex]
related: [go-conc-mutex-defer-unlock, go-lint-lostcancel]
sources:
  - title: cmd/vet - copylocks
    url: https://pkg.go.dev/cmd/vet
  - title: Package sync - Mutex
    url: https://pkg.go.dev/sync
---
> Take a pointer when a struct holds a lock; a copy locks a different mutex.

## Why

The sync documentation says a Mutex must not be copied after first use, and vet's copylocks check reports functions that pass a lock by value. A copy of the struct carries a copy of the lock state, so the copy appears unlocked while the original is held, and neither goroutine excludes the other. Taking a pointer keeps one lock protecting one value.

## Bad

```go
import "sync"

type Counter struct {
    mu sync.Mutex
    n  int
}

func inc(c Counter) {
    c.mu.Lock()
    c.n++
    c.mu.Unlock()
}
```

## Good

```go
import "sync"

type Counter struct {
    mu sync.Mutex
    n  int
}

func inc(c *Counter) {
    c.mu.Lock()
    c.n++
    c.mu.Unlock()
}
```

## See Also

- [go-conc-mutex-defer-unlock](conc-mutex-defer-unlock.md) - releasing the lock safely
- [go-lint-lostcancel](lint-lostcancel.md) - the other resource that must not leak
