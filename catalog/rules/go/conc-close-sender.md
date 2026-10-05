---
id: go-conc-close-sender
lang: go
prefix: conc
title: Close a channel only from the sender, when no more values will be sent
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [channel, close, sender, panic, range]
  files: ["**/*.go"]
  symbols: [close]
related: [go-conc-done-broadcast, go-err-goroutine-collect, go-conc-select-cancel]
sources:
  - title: Package builtin - close
    url: https://pkg.go.dev/builtin
  - title: The Go Programming Language Specification - Close
    url: https://go.dev/ref/spec
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
---
> Let the sender close the channel; receivers stop by canceling, never by closing.

## Why

The close documentation says it should be executed only by the sender, never the receiver, and the specification makes a send on a closed channel a run-time panic, so closing from the receiver side turns a shutdown into a crash. Pipeline stages close their outbound channel once all sends are done, and a closed channel yields the zero value so downstream `range` loops terminate. A receiver that wants to stop listening cancels a context and the sender's select on that signal ends the loop.

## Bad

```go
func drain(ch chan int) int {
    total := 0
    for v := range ch {
        total += v
    }
    close(ch)
    return total
}
```

## Good

```go
func produce(ch chan<- int, n int) {
    defer close(ch)
    for i := 0; i < n; i++ {
        ch <- i
    }
}

func drain(ch <-chan int) int {
    total := 0
    for v := range ch {
        total += v
    }
    return total
}
```

## See Also

- [go-conc-done-broadcast](conc-done-broadcast.md) - closing as a broadcast signal
- [go-conc-select-cancel](conc-select-cancel.md) - how a receiver stops without closing
- [go-err-goroutine-collect](err-goroutine-collect.md) - closing the result channel after all senders finish
