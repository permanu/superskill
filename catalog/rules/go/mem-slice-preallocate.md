---
id: go-mem-slice-preallocate
lang: go
prefix: mem
title: Preallocate slices when the final size is known
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slice, make, capacity, append, allocation]
  files: ["**/*.go"]
  symbols: [make, append]
related: [go-mem-append-alias, go-mem-slices-sort]
sources:
  - title: "Go Slices: usage and internals - Growing slices"
    url: https://go.dev/blog/go-slices-usage-and-internals
  - title: Package slices - Grow
    url: https://pkg.go.dev/slices
---
> Give append the capacity it needs instead of growing one element at a time.

## Why

Appending to a nil slice reallocates and copies the backing array repeatedly as it grows, which the slices article walks through step by step. When the count is known, make with an explicit capacity allocates once and the appends never copy. slices.Grow does the same for an existing slice when the exact final size is awkward to express.

## Bad

```go
func squares(n int) []int {
    var out []int
    for i := 0; i < n; i++ {
        out = append(out, i*i)
    }
    return out
}
```

## Good

```go
func squares(n int) []int {
    out := make([]int, 0, n)
    for i := 0; i < n; i++ {
        out = append(out, i*i)
    }
    return out
}
```

## See Also

- [go-mem-append-alias](mem-append-alias.md) - why the returned slice may share storage
- [go-mem-slices-sort](mem-slices-sort.md) - the slices package helpers that pair with this
