---
id: go-anti-nil-map-write
lang: go
prefix: anti
title: Initialize a map before writing to it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nil map, make, panic, assignment]
  files: ["**/*.go"]
  symbols: []
related: [go-anti-map-iteration-order, go-mem-map-clear]
sources:
  - title: The Go Programming Language Specification - Map types
    url: https://go.dev/ref/spec
  - title: Package maps
    url: https://pkg.go.dev/maps
---
> A nil map reads like an empty one but panics on the first write.

## Why

The specification says a nil map is equivalent to an empty map except that no elements may be added. Reads, range loops, and len all treat a nil map as empty, so the mistake stays hidden until the first assignment panics at run time. Declaring the map with make, or writing it as a non-nil literal, makes the first write legal and keeps the function honest about owning storage.

## Bad

```go
func count() map[string]int {
    var m map[string]int
    m["total"] = 1
    return m
}
```

## Good

```go
func count() map[string]int {
    m := make(map[string]int)
    m["total"] = 1
    return m
}
```

## See Also

- [go-anti-map-iteration-order](anti-map-iteration-order.md) - the other map behavior that reads as deterministic but is not
- [go-mem-map-clear](mem-map-clear.md) - emptying maps with clear instead of a delete loop
