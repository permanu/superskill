---
id: go-gen-prefer-functions
lang: go
prefix: gen
title: Prefer a comparison function over a method constraint
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, constraint, comparison function, methods]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-write-code-first, go-gen-containers]
sources:
  - title: When To Use Generics - For type parameters, prefer functions to methods
    url: https://go.dev/blog/when-generics
  - title: Package cmp - Compare
    url: https://pkg.go.dev/cmp
---
> Take the ordering as a func field so any type can be used without a method.

## Why

The generics guide says that when a type parameter needs something like a comparison, prefer passing a function to requiring a method: it is much simpler to turn a method into a function than to add a method to a type. A method constraint forces every caller, including types from other packages, to define a wrapper type before the generic code can be used. The cmp package shows the same design, exposing Compare and Less as functions over ordered types.

## Bad

```go
type Comparer[T any] interface {
    Compare(T) int
}

func Max[T Comparer[T]](a, b T) T {
    if a.Compare(b) >= 0 {
        return a
    }
    return b
}
```

## Good

```go
func Max[T any](a, b T, cmp func(T, T) int) T {
    if cmp(a, b) >= 0 {
        return a
    }
    return b
}
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - when the type parameter is justified at all
- [go-gen-containers](gen-containers.md) - containers that take the same function field
