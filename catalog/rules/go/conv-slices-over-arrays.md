---
id: go-conv-slices-over-arrays
lang: go
prefix: conv
title: Prefer slices over arrays in function signatures
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [arrays, slices, parameters, copying]
  files: ["**/*.go"]
  symbols: []
related: [go-conv-defer-close, go-mem-append-alias]
sources:
  - title: Effective Go - Arrays
    url: https://go.dev/doc/effective_go
  - title: "Go Slices: usage and internals"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Arrays copy on assignment and fix the length; slices pass a header.

## Why

Effective Go says arrays are values, so assigning one array to another copies all the elements, while slices hold references to an underlying array. An array parameter therefore fixes the length at compile time and copies the data on every call. A slice parameter accepts any length and passes only the header.

## Bad

```go
func sum(xs [4]int) int {
    total := 0
    for _, x := range xs {
        total += x
    }
    return total
}
```

## Good

```go
func sum(xs []int) int {
    total := 0
    for _, x := range xs {
        total += x
    }
    return total
}
```

## See Also

- [go-conv-defer-close](conv-defer-close.md) - the other Effective Go convention worth adopting
- [go-mem-append-alias](mem-append-alias.md) - the aliasing that comes with slice headers
