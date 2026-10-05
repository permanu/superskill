---
id: go-iface-optional-capability
lang: go
prefix: iface
title: Detect optional capabilities with a type assertion to a small interface
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type assertion, io.Closer, optional method, capability]
  files: ["**/*.go"]
  symbols: [io.Closer]
related: [go-iface-small-compose, go-iface-accept-narrow, go-iface-not-premature]
sources:
  - title: Go FAQ - Why is there no type inheritance?
    url: https://go.dev/doc/faq
  - title: Package io - Closer
    url: https://pkg.go.dev/io
  - title: "Go Data Structures: Interfaces"
    url: https://research.swtch.com/interfaces
---
> Check for optional behavior with a type assertion instead of widening the core interface.

## Why

Adding Close or Flush to the main interface forces every implementation to provide it even where it is meaningless. A separate one-method interface can be asserted at the point that needs the capability; the FAQ describes interfaces as addable after the fact, and the interface runtime makes the check cheap and cached. Callers ask for exactly the behavior they use, and implementations opt in by having the method.

## Bad

```go
type Conn interface {
    Read(p []byte) (int, error)
    Close() error
}
```

## Good

```go
type Reader interface {
    Read(p []byte) (int, error)
}

func shutdown(v any) error {
    if c, ok := v.(io.Closer); ok {
        return c.Close()
    }
    return nil
}
```

## See Also

- [go-iface-small-compose](iface-small-compose.md) - keeping the core interface minimal
- [go-iface-accept-narrow](iface-accept-narrow.md) - depending on only what is required
- [go-iface-not-premature](iface-not-premature.md) - growing the interface only when a consumer needs it
