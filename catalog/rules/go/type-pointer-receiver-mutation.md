---
id: go-type-pointer-receiver-mutation
lang: go
prefix: type
title: Use a pointer receiver when the method mutates
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [receiver, pointer, mutation, copy]
  files: ["**/*.go"]
  symbols: []
related: [go-iface-receivers-consistent, go-type-embed-promote]
sources:
  - title: Effective Go - Pointers vs. Values
    url: https://go.dev/doc/effective_go
  - title: The Go Programming Language Specification - Method declarations
    url: https://go.dev/ref/spec
---
> A value receiver mutates a copy; the caller's value never changes.

## Why

Effective Go explains that pointer methods can modify the receiver, and that invoking them on a value would cause the method to receive a copy whose modifications are discarded. A value receiver that mutates its copy therefore compiles and does nothing: the caller's value is untouched. Declaring the receiver as a pointer makes the mutation visible in the signature and puts the method in the method set of *T, where the mutation can land.

## Bad

```go
type Counter struct{ n int }

func (c Counter) Inc() { c.n++ }
```

## Good

```go
type Counter struct{ n int }

func (c *Counter) Inc() { c.n++ }
```

## See Also

- [go-iface-receivers-consistent](iface-receivers-consistent.md) - one receiver kind per type
- [go-type-embed-promote](type-embed-promote.md) - how promoted methods pick their receiver
