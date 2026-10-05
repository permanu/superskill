---
id: go-conc-sync-function
lang: go
prefix: conc
title: Prefer synchronous functions and let callers add concurrency
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [synchronous, goroutine, callback, API design]
  files: ["**/*.go"]
  symbols: [go]
related: [go-conc-goroutine-lifetime, go-conc-bounded-parallelism]
sources:
  - title: Go Code Review Comments - Synchronous Functions
    url: https://go.dev/wiki/CodeReviewComments
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
---
> Return results directly; let the caller decide whether to run the call in a goroutine.

## Why

A synchronous function keeps goroutine lifetimes local, which makes leaks and data races easy to reason about and the function easy to test. Callers who need concurrency add one `go` statement, while concurrency baked into the function cannot be removed and hides its completion signal. The review guide states the preference directly and notes that removing concurrency at the call site is hard.

## Bad

```go
type Row struct{ ID string }

func SaveAll(rows []Row, done chan<- error) {
    go func() {
        done <- save(rows)
    }()
}

func save(rows []Row) error { return nil }
```

## Good

```go
type Row struct{ ID string }

func SaveAll(rows []Row) error {
    return save(rows)
}

func save(rows []Row) error { return nil }
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - why localized lifetimes matter
- [go-conc-bounded-parallelism](conc-bounded-parallelism.md) - the caller adding concurrency with a bound
