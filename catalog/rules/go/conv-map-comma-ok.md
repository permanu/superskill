---
id: go-conv-map-comma-ok
lang: go
prefix: conv
title: Test map membership with the comma-ok form
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, comma ok, presence, zero value]
  files: ["**/*.go"]
  symbols: []
related: [go-conv-chan-direction, go-anti-nil-map-write]
sources:
  - title: The Go Programming Language Specification - Index expressions
    url: https://go.dev/ref/spec
  - title: Package maps
    url: https://pkg.go.dev/maps
---
> A stored zero and a missing key look identical to a value check.

## Why

The specification says a map index expression used in the special form v, ok = a[x] yields an additional untyped boolean value whose value is true if the key is present in the map, and false otherwise. Comparing the value against the zero value instead conflates a missing key with a stored zero. The comma-ok form answers presence directly and never lies.

## Bad

```go
func lookup(m map[string]int, key string) (int, bool) {
    v := m[key]
    return v, v != 0
}
```

## Good

```go
func lookup(m map[string]int, key string) (int, bool) {
    v, ok := m[key]
    return v, ok
}
```

## See Also

- [go-conv-chan-direction](conv-chan-direction.md) - the other form of presence checking
- [go-anti-nil-map-write](anti-nil-map-write.md) - reading a nil map safely
