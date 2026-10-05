---
id: go-pat-pipelines
lang: go
prefix: pat
title: Compose streaming work as pipeline stages
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pipeline, stages, channels, streaming]
  files: ["**/*.go"]
  symbols: []
related: [go-pat-fan-in, go-conc-goroutine-lifetime]
sources:
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
  - title: Package sync - WaitGroup
    url: https://pkg.go.dev/sync
---
> Channel-per-stage lets stages overlap instead of buffering whole slices.

## Why

The pipelines article defines a pipeline as a series of stages connected by channels, where each stage is a group of goroutines running the same function, and gives the pattern: stages close their outbound channels when all sends are done and keep receiving until inbound channels close. A function that materializes a slice between every step buffers the whole dataset and cannot start the next stage early. Returning a channel per stage lets stages overlap and compose by type.

## Bad

```go
func square(nums []int) []int {
    out := make([]int, 0, len(nums))
    for _, n := range nums {
        out = append(out, n*n)
    }
    return out
}
```

## Good

```go
func square(nums []int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n * n
        }
    }()
    return out
}
```

## See Also

- [go-pat-fan-in](pat-fan-in.md) - merging several stages back together
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the exit path every stage needs
