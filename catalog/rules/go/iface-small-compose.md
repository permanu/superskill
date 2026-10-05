---
id: go-iface-small-compose
lang: go
prefix: iface
title: Keep interfaces small and compose them instead of declaring one wide interface
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, composition, io.Reader, method set]
  files: ["**/*.go"]
  symbols: [io.Reader, io.Writer]
related: [go-iface-accept-narrow, go-iface-optional-capability, go-iface-consumer-defined]
sources:
  - title: Go FAQ - Why is there no type inheritance?
    url: https://go.dev/doc/faq
  - title: Package io - ReadWriter
    url: https://pkg.go.dev/io
  - title: Effective Go - Interface names
    url: https://go.dev/doc/effective_go
---
> Prefer one- or two-method interfaces and compose them when a caller needs more.

## Why

A wide interface is harder to implement and harder to consume: every implementer must provide methods a given caller never uses. The FAQ notes that an interface with one or even zero methods can express a useful concept, and the io package composes Reader and Writer rather than declaring one combined type. Composition lets each function depend on exactly the methods it calls.

## Bad

```go
type ReadWriter interface {
    Read(p []byte) (int, error)
    Write(p []byte) (int, error)
    Close() error
    Seek(offset int64, whence int) (int64, error)
}
```

## Good

```go
type ReadWriter interface {
    io.Reader
    io.Writer
}
```

## See Also

- [go-iface-accept-narrow](iface-accept-narrow.md) - choosing the subset a function needs
- [go-iface-optional-capability](iface-optional-capability.md) - adding Close without widening this interface
- [go-iface-consumer-defined](iface-consumer-defined.md) - who declares the composed interface
