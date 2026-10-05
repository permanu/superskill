---
id: go-mem-min-max
lang: go
prefix: mem
title: Use the min and max builtins instead of hand-written comparisons
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [min, max, builtin, clamp]
  files: ["**/*.go"]
  symbols: [min, max]
related: [go-mem-slices-sort, go-mem-map-clear]
sources:
  - title: Package builtin - min and max
    url: https://pkg.go.dev/builtin
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Clamp and compare with the min and max builtins.

## Why

The builtins are defined for any ordered type and accept more than two arguments, so they replace both the two-value if and the chained clamp. The builtin documentation defines their behavior precisely, including NaN propagation for floats. A hand-written branch encodes the same logic with more lines and an easy to invert comparison.

## Bad

```go
func clamp(v, lo, hi int) int {
    if v < lo {
        return lo
    }
    if v > hi {
        return hi
    }
    return v
}
```

## Good

```go
func clamp(v, lo, hi int) int {
    return min(max(v, lo), hi)
}
```

## See Also

- [go-mem-slices-sort](mem-slices-sort.md) - ordered-type helpers in the slices package
- [go-mem-map-clear](mem-map-clear.md) - another builtin that replaces a hand-written loop
