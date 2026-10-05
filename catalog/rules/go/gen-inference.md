---
id: go-gen-inference
lang: go
prefix: gen
title: Let type inference supply type arguments at call sites
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type inference, type arguments, call site, generics]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-write-code-first, go-gen-stdlib-helpers]
sources:
  - title: The Go Programming Language Specification - Type inference
    url: https://go.dev/ref/spec
  - title: Package slices
    url: https://pkg.go.dev/slices
---
> Omit type arguments that the compiler can infer from the arguments.

## Why

The specification says a use of a generic function may omit some or all type arguments when they can be inferred from the context, and that inference fails only when the equations cannot be solved. Spelling out SortedCopy[int](xs) repeats what the argument already states and can even pin a different element type than intended. The slices package's own call sites rely on inference, as in slices.Sort(out).

## Bad

```go
import "slices"

func SortedCopy[T int | string](xs []T) []T {
    out := slices.Clone(xs)
    slices.Sort(out)
    return out
}

func use() []int {
    return SortedCopy[int]([]int{2, 1})
}
```

## Good

```go
import "slices"

func SortedCopy[T int | string](xs []T) []T {
    out := slices.Clone(xs)
    slices.Sort(out)
    return out
}

func use() []int {
    return SortedCopy([]int{2, 1})
}
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - the function whose type parameters are being inferred
- [go-gen-stdlib-helpers](gen-stdlib-helpers.md) - call sites that already work this way
