---
id: go-type-embed-promote
lang: go
prefix: type
title: Embed a type to promote its methods instead of forwarding them
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [embedding, promotion, interface, forwarding]
  files: ["**/*.go"]
  symbols: []
related: [go-type-pointer-receiver-mutation, go-iface-small-compose]
sources:
  - title: Effective Go - Embedding
    url: https://go.dev/doc/effective_go
  - title: The Go Programming Language Specification - Struct types
    url: https://go.dev/ref/spec
---
> Embedded methods come along for free and keep the inner receiver.

## Why

Effective Go says that by embedding a type directly, the methods of embedded types come along for free, and that when they are invoked the receiver is the inner type, not the outer one. Writing forwarding methods by hand duplicates every method and drifts when the embedded interface grows. The specification adds that the unqualified type name acts as the field name, so the embedded value stays reachable for the methods that customize behavior.

## Bad

```go
import "io"

type ReadCounter struct {
    r io.Reader
}

func (rc *ReadCounter) Read(p []byte) (int, error) { return rc.r.Read(p) }
```

## Good

```go
import "io"

type ReadCounter struct {
    io.Reader
}
```

## See Also

- [go-type-pointer-receiver-mutation](type-pointer-receiver-mutation.md) - whose receiver a promoted method uses
- [go-iface-small-compose](iface-small-compose.md) - the interface side of the same idea
