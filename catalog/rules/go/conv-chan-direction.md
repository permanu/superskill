---
id: go-conv-chan-direction
lang: go
prefix: conv
title: Give channels a direction in function signatures
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [channel direction, send-only, receive-only]
  files: ["**/*.go"]
  symbols: []
related: [go-conv-map-comma-ok, go-conc-close-sender]
sources:
  - title: The Go Programming Language Specification - Channel types
    url: https://go.dev/ref/spec
  - title: Effective Go - Channels
    url: https://go.dev/doc/effective_go
---
> A bidirectional parameter hands every caller the power to misuse it.

## Why

The specification says the optional <- operator specifies the channel direction, send or receive, and that a channel without a direction is bidirectional. A function returning a bidirectional channel hands every caller the power to send, receive, and close it. Directional signatures state the contract in the type and let the compiler reject misuse.

## Bad

```go
func producer() chan int {
    return make(chan int)
}
```

## Good

```go
func producer() <-chan int {
    return make(chan int)
}
```

## See Also

- [go-conv-map-comma-ok](conv-map-comma-ok.md) - another form of explicit presence
- [go-conc-close-sender](conc-close-sender.md) - who may close the channel a signature exposes
