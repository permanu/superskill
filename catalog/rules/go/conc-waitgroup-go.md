---
id: go-conc-waitgroup-go
lang: go
prefix: conc
title: Use WaitGroup.Go to launch tracked goroutines instead of manual Add and Done
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WaitGroup, goroutine, Add, Done, sync]
  files: ["**/*.go"]
  symbols: [sync.WaitGroup.Go, sync.WaitGroup]
related: [go-conc-bounded-parallelism, go-conc-goroutine-lifetime, go-err-goroutine-collect]
sources:
  - title: Package sync - WaitGroup.Go
    url: https://pkg.go.dev/sync
  - title: Go Code Review Comments - Goroutine Lifetimes
    url: https://go.dev/wiki/CodeReviewComments
---
> Launch tracked goroutines with WaitGroup.Go; it pairs Add and Done for you.

## Why

The manual pattern must call Add before starting the goroutine and Done on every return path; getting either wrong panics with a negative counter or hangs Wait forever. The sync package now provides WaitGroup.Go, which adds the task, runs the function in a new goroutine, and removes the task when it returns, and the documentation recommends it over Add and Done. Manual Add remains for tracking work that is not started as a goroutine.

## Bad

```go
func run(tasks []func()) {
    var wg sync.WaitGroup
    for _, task := range tasks {
        wg.Add(1)
        go func() {
            defer wg.Done()
            task()
        }()
    }
    wg.Wait()
}
```

## Good

```go
func run(tasks []func()) {
    var wg sync.WaitGroup
    for _, task := range tasks {
        wg.Go(task)
    }
    wg.Wait()
}
```

## See Also

- [go-conc-bounded-parallelism](conc-bounded-parallelism.md) - combining WaitGroup.Go with a semaphore
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the exit path Wait observes
- [go-err-goroutine-collect](err-goroutine-collect.md) - when the tasks also return errors
