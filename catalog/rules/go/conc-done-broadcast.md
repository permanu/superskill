---
id: go-conc-done-broadcast
lang: go
prefix: conc
title: Broadcast completion by closing a channel instead of sending one value per receiver
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [channel, close, broadcast, done, signal]
  files: ["**/*.go"]
  symbols: [close]
related: [go-conc-close-sender, go-conc-select-cancel]
sources:
  - title: Go Concurrency Patterns - Pipelines and cancellation
    url: https://go.dev/blog/pipelines
  - title: Effective Go - Channels
    url: https://go.dev/doc/effective_go
---
> Signal any number of waiters by closing a channel; a send reaches exactly one receiver.

## Why

A receive on a closed channel proceeds immediately for every receiver, so one close broadcasts to an unbounded set of waiters. Sending N values requires knowing N and blocks when a receiver is late; the pipelines article shows that tracking blocked senders by hand is tedious and error-prone, and replaces it with a closed done channel. Ownership still applies: the party that knows the work is done performs the close.

## Bad

```go
func stop(watchers int, done chan<- struct{}) {
    for i := 0; i < watchers; i++ {
        done <- struct{}{}
    }
}
```

## Good

```go
func stop(done chan struct{}) {
    close(done)
}
```

## See Also

- [go-conc-close-sender](conc-close-sender.md) - who is allowed to close
- [go-conc-select-cancel](conc-select-cancel.md) - receivers select on the closed channel
