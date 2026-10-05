---
id: go-anti-map-iteration-order
lang: go
prefix: anti
title: Never rely on map iteration order
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, range, iteration order, determinism]
  files: ["**/*.go"]
  symbols: []
related: [go-anti-nil-map-write, go-mem-maps-clone]
sources:
  - title: The Go Programming Language Specification - For statements
    url: https://go.dev/ref/spec
  - title: Package maps
    url: https://pkg.go.dev/maps
---
> Sort or record keys when order matters; range order is deliberately unspecified.

## Why

The specification states that the iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next. A loop that returns the first key it sees therefore produces different results on different runs, and any test that passes does so by luck. Recording the keys and sorting them, or keeping an ordered slice alongside the map, is the only way to make the result reproducible.

## Bad

```go
func firstKey(m map[string]int) string {
    for k := range m {
        return k
    }
    return ""
}
```

## Good

```go
import "slices"

func firstKey(m map[string]int) string {
    keys := make([]string, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    slices.Sort(keys)
    if len(keys) == 0 {
        return ""
    }
    return keys[0]
}
```

## See Also

- [go-anti-nil-map-write](anti-nil-map-write.md) - the other map trap that reads fine and fails later
- [go-mem-maps-clone](mem-maps-clone.md) - cloning maps before exposing them
