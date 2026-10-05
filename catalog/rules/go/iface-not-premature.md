---
id: go-iface-not-premature
lang: go
prefix: iface
title: Do not introduce an interface until a second implementation or a consumer needs it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, premature abstraction, concrete type]
  files: ["**/*.go"]
  symbols: [interface]
related: [go-iface-consumer-defined, go-iface-no-mock-only]
sources:
  - title: Go Code Review Comments - Interfaces
    url: https://go.dev/wiki/CodeReviewComments
  - title: Effective Go - Interfaces
    url: https://go.dev/doc/effective_go
---
> Start with a concrete type; extract an interface only when a real consumer appears.

## Why

An interface guessed before its first consumer is the wrong size and shape; the review guide warns that without a realistic example of usage it is impossible to see which methods belong. A concrete type can gain methods freely, while every method added to an interface breaks implementations. Extract the interface when a second implementation or a consumer's needs make the method set obvious.

## Bad

```go
type Notifier interface {
    Notify(msg string) error
}

type Email struct{}

func (Email) Notify(msg string) error { return nil }
```

## Good

```go
type Email struct{}

func (Email) Notify(msg string) error { return nil }

type Notifier interface {
    Notify(msg string) error
}

func alert(n Notifier, msg string) error { return n.Notify(msg) }
```

## See Also

- [go-iface-consumer-defined](iface-consumer-defined.md) - the consumer that justifies the interface
- [go-iface-no-mock-only](iface-no-mock-only.md) - the other premature reason to abstract
