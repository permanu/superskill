---
id: go-conc-bounded-parallelism
lang: go
prefix: conc
title: Bound concurrency when spawning per item, with a semaphore or a worker pool
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [semaphore, worker pool, concurrency limit, parallelism]
  files: ["**/*.go"]
  symbols: [sync.WaitGroup, make]
related: [go-conc-goroutine-lifetime, go-err-goroutine-collect, go-conc-waitgroup-go]
sources:
  - title: Go Concurrency Patterns - Bounded parallelism
    url: https://go.dev/blog/pipelines
  - title: errgroup package - SetLimit
    url: https://pkg.go.dev/golang.org/x/sync/errgroup
---
> Cap the number of goroutines with a buffered semaphore or a fixed worker pool.

## Why

One goroutine per input scales with the input, not with the machine; a large directory or request batch can exhaust memory before the work finishes. The pipelines article bounds parallelism with a fixed number of worker goroutines, and errgroup offers SetLimit for the same job with error propagation attached. The semaphore below is the standard-library version: the buffered channel holds one token per allowed concurrent task.

## Bad

```go
func processAll(urls []string) {
    for _, url := range urls {
        go process(url)
    }
}

func process(url string) {}
```

## Good

```go
func processAll(urls []string, limit int) {
    sem := make(chan struct{}, limit)
    var wg sync.WaitGroup
    for _, url := range urls {
        sem <- struct{}{}
        wg.Go(func() {
            defer func() { <-sem }()
            process(url)
        })
    }
    wg.Wait()
}

func process(url string) {}
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - why every spawned goroutine needs an exit
- [go-err-goroutine-collect](err-goroutine-collect.md) - collecting the failures of the bounded group
- [go-conc-waitgroup-go](conc-waitgroup-go.md) - the launch primitive used here
