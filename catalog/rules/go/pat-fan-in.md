---
id: go-pat-fan-in
lang: go
prefix: pat
title: Merge channels with a select loop, not sequential drains
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fan-in, merge, select, channels]
  files: ["**/*.go"]
  symbols: []
related: [go-pat-pipelines, go-conc-close-sender]
sources:
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
  - title: The Go Programming Language Specification - Select statements
    url: https://go.dev/ref/spec
---
> Fan-in consumes whichever input is ready and closes when all are done.

## Why

The pipelines article says a function can read from multiple inputs and proceed until all are closed by multiplexing the input channels onto a single channel that is closed when all inputs are closed, and calls this fan-in. Draining one channel fully before touching the next serializes the sources and buffers everything between them. The select loop consumes whichever channel is ready and exits when both are nil.

## Bad

```go
func merge(a, b <-chan int) []int {
    var out []int
    for v := range a {
        out = append(out, v)
    }
    for v := range b {
        out = append(out, v)
    }
    return out
}
```

## Good

```go
func merge(a, b <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for a != nil || b != nil {
            select {
            case v, ok := <-a:
                if !ok {
                    a = nil
                    continue
                }
                out <- v
            case v, ok := <-b:
                if !ok {
                    b = nil
                    continue
                }
                out <- v
            }
        }
    }()
    return out
}
```

## See Also

- [go-pat-pipelines](pat-pipelines.md) - the stages being merged
- [go-conc-close-sender](conc-close-sender.md) - who closes each input
