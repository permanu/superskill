---
id: go-conc-select-cancel
lang: go
prefix: conc
title: Select on ctx.Done() in every long-lived loop that blocks on a channel
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [select, context, cancellation, channel, shutdown]
  files: ["**/*.go"]
  symbols: [select, ctx.Done]
related: [go-err-context-first-param, go-err-context-preserve, go-conc-goroutine-lifetime]
sources:
  - title: Package context
    url: https://pkg.go.dev/context
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
---
> Pair each blocking send or receive in a long-lived goroutine with a ctx.Done() case.

## Why

A goroutine blocked on a bare channel operation cannot observe cancellation, so shutdown hangs until the channel happens to move. Selecting on `ctx.Done()` gives every blocking point an exit; the context package defines Done for use in select statements, and the pipelines article applies the same pattern with a done channel to unblock senders. A receive that never watches Done is a shutdown bug waiting for traffic.

## Bad

```go
func worker(ctx context.Context, jobs <-chan Job, out chan<- Result) {
    for {
        job := <-jobs
        out <- process(job)
    }
}

type Job struct{}

type Result struct{}

func process(Job) Result { return Result{} }
```

## Good

```go
func worker(ctx context.Context, jobs <-chan Job, out chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            return
        case job := <-jobs:
            select {
            case out <- process(job):
            case <-ctx.Done():
                return
            }
        }
    }
}

type Job struct{}

type Result struct{}

func process(Job) Result { return Result{} }
```

## See Also

- [go-err-context-first-param](err-context-first-param.md) - where the context enters the API
- [go-err-context-preserve](err-context-preserve.md) - returning cancellation without losing its identity
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the exit path this select provides
