---
id: go-anti-nil-channel
lang: go
prefix: anti
title: Make channels before sending, receiving, or closing
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nil channel, make, block, deadlock]
  files: ["**/*.go"]
  symbols: []
related: [go-anti-nil-map-write, go-conc-close-sender]
sources:
  - title: The Go Programming Language Specification - Send statements
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Receive operator
    url: https://go.dev/ref/spec
---
> Sends and receives on a nil channel block forever; close panics.

## Why

The specification states that a send on a nil channel blocks forever and that receiving from a nil channel blocks forever, and it adds that closing the nil channel causes a run-time panic. A channel that is declared but never made therefore turns into a deadlock or a panic instead of a type error; the failure surfaces only on the branch that reaches it. Creating the channel with make at the point of ownership keeps every send, receive, and close on a usable value.

## Bad

```go
func producer(vals []int) <-chan int {
    var ch chan int
    go func() {
        defer close(ch)
        for _, v := range vals {
            ch <- v
        }
    }()
    return ch
}
```

## Good

```go
func producer(vals []int) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for _, v := range vals {
            ch <- v
        }
    }()
    return ch
}
```

## See Also

- [go-anti-nil-map-write](anti-nil-map-write.md) - the same nil-versus-empty trap for maps
- [go-conc-close-sender](conc-close-sender.md) - who is allowed to close a channel
