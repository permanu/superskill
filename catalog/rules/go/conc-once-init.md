---
id: go-conc-once-init
lang: go
prefix: conc
title: Initialize shared state exactly once with sync.OnceValue, not a racy nil check
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sync.Once, initialization, race, singleton]
  files: ["**/*.go"]
  symbols: [sync.OnceValue, sync.Once]
related: [go-conc-goroutine-lifetime, go-conc-typed-atomics]
sources:
  - title: Package sync - OnceValue
    url: https://pkg.go.dev/sync
  - title: Go Code Review Comments - Goroutine Lifetimes
    url: https://go.dev/wiki/CodeReviewComments
---
> Guard one-time initialization with sync.OnceValue; a nil check races under concurrency.

## Why

Check-then-act initialization races: two goroutines can both see nil and load twice, and readers can observe a partially built value without synchronization. `sync.OnceValue` returns a function that runs the loader exactly once and publishes the result with the memory guarantees Once provides. OnceFunc, OnceValue, and OnceValues cover the common shapes without a hand-rolled Once field and captured variable.

## Bad

```go
var cfg *Config

func get() *Config {
    if cfg == nil {
        cfg = load()
    }
    return cfg
}

type Config struct{}

func load() *Config { return &Config{} }
```

## Good

```go
var get = sync.OnceValue(load)

type Config struct{}

func load() *Config { return &Config{} }
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the goroutines that race on this initialization
- [go-conc-typed-atomics](conc-typed-atomics.md) - the single-word counterpart for counters and flags
