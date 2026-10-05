---
id: go-type-map-element-copy
lang: go
prefix: type
title: Update map elements by storing the modified copy back
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, addressable, copy, assignment]
  files: ["**/*.go"]
  symbols: []
related: [go-type-make-for-reference, go-conc-mutex-map]
sources:
  - title: The Go Programming Language Specification - Address operators
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Assignment statements
    url: https://go.dev/ref/spec
---
> Map indexes are not addressable; a modified copy must be stored back.

## Why

The specification's addressability rule lists variables, pointer indirection, slice indexing, fields of an addressable struct, and array indexing; a map index is not among them, though the assignment rule accepts a map index expression on the left-hand side. Updating a map element therefore means reading the value, changing the copy, and storing it back. Skipping the store leaves the mutation in a copy that is immediately discarded.

## Bad

```go
type Point struct{ X, Y int }

func shift(m map[string]Point) {
    p := m["origin"]
    p.X++
}
```

## Good

```go
type Point struct{ X, Y int }

func shift(m map[string]Point) {
    p := m["origin"]
    p.X++
    m["origin"] = p
}
```

## See Also

- [go-type-make-for-reference](type-make-for-reference.md) - initializing the map before it is used
- [go-conc-mutex-map](conc-mutex-map.md) - guarding the read-modify-write against other goroutines
