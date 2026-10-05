---
id: go-conc-mutex-defer-unlock
lang: go
prefix: conc
title: Unlock mutexes with defer so every return path releases them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutex, lock, defer, deadlock]
  files: ["**/*.go"]
  symbols: [sync.Mutex, defer]
related: [go-conc-mutex-map, go-conc-atomics-not-locks]
sources:
  - title: Effective Go - Defer
    url: https://go.dev/doc/effective_go
  - title: Package sync - Mutex
    url: https://pkg.go.dev/sync
---
> Pair Lock with an immediate defer Unlock; never leave a path that holds the lock.

## Why

A missed unlock on an early return deadlocks every later caller, and the failure surfaces far from the bug. Defer ties the release to the acquisition and keeps the critical section visible; Effective Go's canonical defer examples are unlocking a mutex and closing a file. An Unlock that runs only on the happy path is one added error branch away from a deadlock.

## Bad

```go
type Counter struct {
    mu     sync.Mutex
    closed bool
    n      int
}

func (c *Counter) Inc() error {
    c.mu.Lock()
    if c.closed {
        return errClosed
    }
    c.n++
    c.mu.Unlock()
    return nil
}

var errClosed = errors.New("closed")
```

## Good

```go
type Counter struct {
    mu     sync.Mutex
    closed bool
    n      int
}

func (c *Counter) Inc() error {
    c.mu.Lock()
    defer c.mu.Unlock()
    if c.closed {
        return errClosed
    }
    c.n++
    return nil
}

var errClosed = errors.New("closed")
```

## See Also

- [go-conc-mutex-map](conc-mutex-map.md) - the map updates these locks protect
- [go-conc-atomics-not-locks](conc-atomics-not-locks.md) - deciding between a lock and an atomic
