---
id: go-type-make-for-reference
lang: go
prefix: type
title: Initialize slices, maps, and channels with make, not new
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [make, new, nil map, initialization]
  files: ["**/*.go"]
  symbols: []
related: [go-anti-nil-map-write, go-type-named-units]
sources:
  - title: The Go Programming Language Specification - Making slices, maps and channels
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Allocation
    url: https://go.dev/ref/spec
---
> make returns a ready value of T; new returns a pointer to a zero T.

## Why

The specification says make takes a type T that must be a slice, map, or channel and returns a value of type T, not *T. new allocates a zero value and returns a pointer, so for a map it produces a pointer to a nil map that panics on the first write. make is the constructor for the three reference types and the only one that initializes them.

## Bad

```go
func newCounts() map[string]int {
    return *new(map[string]int)
}
```

## Good

```go
func newCounts() map[string]int {
    return make(map[string]int)
}
```

## See Also

- [go-anti-nil-map-write](anti-nil-map-write.md) - the panic a pointer-to-nil map leads to
- [go-type-named-units](type-named-units.md) - the other constructor-shaped trap in the type system
