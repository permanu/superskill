---
id: go-type-interface-comparison
lang: go
prefix: type
title: Compare concrete types, not any, when values may be incomparable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface comparison, panic, comparable, any]
  files: ["**/*.go"]
  symbols: []
related: [go-type-definition-over-alias, go-anti-unchecked-type-assertion]
sources:
  - title: The Go Programming Language Specification - Comparison operators
    url: https://go.dev/ref/spec
---
> == on interface values panics when the dynamic type is not comparable.

## Why

The specification says a comparison of two interface values with identical dynamic types causes a run-time panic if that type is not comparable, and that this applies to arrays of interface values and structs with interface-valued fields as well. A helper that takes any and compares with == therefore compiles for every input and fails only for the values that carry slices, maps, or funcs. Comparing concrete types lets the compiler reject incomparable types before the program runs.

## Bad

```go
func same(a, b any) bool {
    return a == b
}
```

## Good

```go
type Point struct {
    X, Y int
}

func same(a, b Point) bool {
    return a == b
}
```

## See Also

- [go-type-definition-over-alias](type-definition-over-alias.md) - keeping types distinct so comparisons stay meaningful
- [go-anti-unchecked-type-assertion](anti-unchecked-type-assertion.md) - handling the dynamic type before comparing
