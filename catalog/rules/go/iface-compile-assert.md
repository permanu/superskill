---
id: go-iface-compile-assert
lang: go
prefix: iface
title: Assert interface satisfaction at compile time with var _ I = (*T)(nil)
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, compile time, assertion, blank identifier]
  files: ["**/*.go"]
  symbols: [var _]
related: [go-iface-receivers-consistent, go-iface-consumer-defined]
sources:
  - title: Go FAQ - How can I guarantee my type satisfies an interface?
    url: https://go.dev/doc/faq
  - title: Effective Go - Interface checks
    url: https://go.dev/doc/effective_go
---
> Prove implementations at compile time with a blank-identifier assertion.

## Why

A runtime type check defers the discovery of a missing method to production, while the compiler can prove the same fact from one declaration. The FAQ's idiom `var _ I = (*T)(nil)` fails the build if the method set changes and documents the intended interface next to the type. Use a value assertion when the methods are defined on the value receiver.

## Bad

```go
type closer struct{}

func (c *closer) Close() error { return nil }

func newCloser() io.Closer {
    c := &closer{}
    if _, ok := any(c).(io.Closer); !ok {
        panic("does not implement io.Closer")
    }
    return c
}
```

## Good

```go
type closer struct{}

func (c *closer) Close() error { return nil }

var _ io.Closer = (*closer)(nil)
```

## See Also

- [go-iface-receivers-consistent](iface-receivers-consistent.md) - pointer versus value method sets
- [go-iface-consumer-defined](iface-consumer-defined.md) - the interface being asserted
