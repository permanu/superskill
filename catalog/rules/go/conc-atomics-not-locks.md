---
id: go-conc-atomics-not-locks
lang: go
prefix: conc
title: Use a mutex for compound invariants and reserve atomics for counters and flags
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, mutex, compare-and-swap, invariant]
  files: ["**/*.go"]
  symbols: [atomic.Int64, sync.Mutex]
related: [go-conc-typed-atomics, go-conc-mutex-defer-unlock, go-conc-mutex-map]
sources:
  - title: Package sync/atomic - Overview
    url: https://pkg.go.dev/sync/atomic
  - title: Package sync - Mutex
    url: https://pkg.go.dev/sync
---
> Keep compound invariants under a mutex; atomics are for single-word counters and flags.

## Why

Atomic operations protect one word at a time, so a compare-and-swap loop must re-encode the whole invariant and can spin under contention. The atomic package warns that these functions require great care and that synchronization is better done with channels or the sync facilities except in special, low-level code. A mutex states the invariant directly and holds it across the entire update.

## Bad

```go
type Account struct {
    balance atomic.Int64
}

func (a *Account) Transfer(delta int64) bool {
    for {
        old := a.balance.Load()
        if old+delta < 0 {
            return false
        }
        if a.balance.CompareAndSwap(old, old+delta) {
            return true
        }
    }
}
```

## Good

```go
type Account struct {
    mu      sync.Mutex
    balance int64
}

func (a *Account) Transfer(delta int64) bool {
    a.mu.Lock()
    defer a.mu.Unlock()
    if a.balance+delta < 0 {
        return false
    }
    a.balance += delta
    return true
}
```

## See Also

- [go-conc-typed-atomics](conc-typed-atomics.md) - the atomic values this rule keeps for simple cases
- [go-conc-mutex-defer-unlock](conc-mutex-defer-unlock.md) - releasing the mutex safely
- [go-conc-mutex-map](conc-mutex-map.md) - the same choice applied to maps
