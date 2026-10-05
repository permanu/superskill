---
id: go-iface-seal-unexported
lang: go
prefix: iface
title: Seal an interface with an unexported method when only your package may implement it
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, unexported method, sealing, extension]
  files: ["**/*.go"]
  symbols: [interface]
related: [go-iface-not-premature, go-iface-consumer-defined]
sources:
  - title: The Go Programming Language Specification - Uniqueness of identifiers
    url: https://go.dev/ref/spec
  - title: Package testing - TB
    url: https://pkg.go.dev/testing
---
> Add an unexported method when implementations are reserved to your package.

## Why

The specification says two identifiers are different when they appear in different packages and are not exported, so a method such as paymentMethod can only be implemented inside the package that declares it. Sealing keeps the implementation set closed: the package can add methods later without breaking implementers, and callers cannot substitute behavior it does not support. The testing package's TB interface shows the device in the standard library, documenting filtered unexported methods alongside its public ones.

## Bad

```go
type Payment interface {
    Pay(amount int) error
}
```

## Good

```go
type Payment interface {
    Pay(amount int) error
    paymentMethod() // only this package can implement Payment
}
```

## See Also

- [go-iface-not-premature](iface-not-premature.md) - introducing the interface only when needed
- [go-iface-consumer-defined](iface-consumer-defined.md) - open interfaces defined by consumers
