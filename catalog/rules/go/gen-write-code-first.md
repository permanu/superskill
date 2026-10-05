---
id: go-gen-write-code-first
lang: go
prefix: gen
title: Add type parameters when the same code repeats for different types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, type parameters, duplication, refactor]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-containers, go-gen-prefer-functions]
sources:
  - title: When To Use Generics
    url: https://go.dev/blog/when-generics
  - title: Go FAQ - When did Go get generic types?
    url: https://go.dev/doc/faq
---
> Write the concrete code first; introduce type parameters when a second copy appears.

## Why

The generics guide's one simple guideline: write the concrete code first, and add a type parameter when you find yourself writing the exact same code multiple times with only the types differing. Starting from constraints inverts the design: the type parameter set is guessed before the operation is understood. The FAQ adds that generics arrived late by design because the feature costs type-system and run-time complexity.

## Bad

```go
func SumInts(xs []int) int {
    total := 0
    for _, x := range xs {
        total += x
    }
    return total
}

func SumFloat64s(xs []float64) float64 {
    var total float64
    for _, x := range xs {
        total += x
    }
    return total
}
```

## Good

```go
type Number interface {
    ~int | ~float64
}

func Sum[T Number](xs []T) T {
    var total T
    for _, x := range xs {
        total += x
    }
    return total
}
```

## See Also

- [go-gen-containers](gen-containers.md) - the data-structure case for type parameters
- [go-gen-prefer-functions](gen-prefer-functions.md) - shaping the constraint once it exists
