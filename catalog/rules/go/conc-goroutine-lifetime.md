---
id: go-conc-goroutine-lifetime
lang: go
prefix: conc
title: Give every goroutine a bounded lifetime and a clear exit path
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goroutine, leak, channel, cancellation, lifetime]
  files: ["**/*.go"]
  symbols: [go, context.Context]
related: [go-err-goroutine-collect, go-conc-select-cancel, go-conc-bounded-parallelism]
sources:
  - title: Go Code Review Comments - Goroutine Lifetimes
    url: https://go.dev/wiki/CodeReviewComments
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Spawn goroutines only with a known exit path; never leave them blocked on a send nobody will receive.

## Why

Goroutines are not garbage collected, so one blocked forever on a channel send holds its stack and everything it references. The review guide asks that it be clear when and whether a goroutine exits, and the pipelines article unblocks senders with buffers or explicit cancellation. The runtime now exposes a goroutine-leak profile for diagnosis, but prevention is structural: every send needs a receiver or a cancellation case.

## Bad

```go
func start() <-chan int {
    ch := make(chan int)
    go func() { ch <- compute() }()
    return ch
}

func compute() int { return 1 }
```

## Good

```go
func start(ctx context.Context) <-chan int {
    ch := make(chan int, 1)
    go func() {
        select {
        case ch <- compute():
        case <-ctx.Done():
        }
    }()
    return ch
}

func compute() int { return 1 }
```

## See Also

- [go-conc-select-cancel](conc-select-cancel.md) - the select case that gives blocked sends an exit
- [go-err-goroutine-collect](err-goroutine-collect.md) - returning the work of goroutines to the caller
- [go-conc-bounded-parallelism](conc-bounded-parallelism.md) - keeping the number of goroutines proportional to the machine
