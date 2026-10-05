---
id: go-iface-interface-over-typeparam
lang: go
prefix: iface
title: Take an interface parameter instead of a type parameter when the body only calls methods
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, type parameter, io.Reader, interface]
  files: ["**/*.go"]
  symbols: [io.Reader]
related: [go-iface-accept-narrow, go-iface-small-compose]
sources:
  - title: When To Use Generics
    url: https://go.dev/blog/when-generics
  - title: Package io
    url: https://pkg.go.dev/io
---
> Use io.Reader, not [T io.Reader], when you only invoke the interface's methods.

## Why

A type parameter constrained to an interface that the body only calls methods on adds syntax without adding capability, and instantiation is not faster than an interface call. The generics guide says to use an interface type when all you do with a value is call a method on it, and reserves type parameters for code that is identical across element types. Reach for generics when the function manipulates values it cannot name.

## Bad

```go
func ReadSome[T io.Reader](r T) ([]byte, error) {
    return io.ReadAll(r)
}
```

## Good

```go
func ReadSome(r io.Reader) ([]byte, error) {
    return io.ReadAll(r)
}
```

## See Also

- [go-iface-accept-narrow](iface-accept-narrow.md) - taking the smallest interface
- [go-iface-small-compose](iface-small-compose.md) - the interfaces worth parameterizing around
