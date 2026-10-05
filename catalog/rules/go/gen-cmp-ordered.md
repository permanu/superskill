---
id: go-gen-cmp-ordered
lang: go
prefix: gen
title: Constrain ordered values with cmp.Ordered, not a hand-written union
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, cmp.Ordered, constraint, ordering]
  files: ["**/*.go"]
  symbols: [cmp.Ordered]
related: [go-gen-write-code-first, go-gen-containers]
sources:
  - title: Package cmp - Ordered
    url: https://pkg.go.dev/cmp
---
> Use cmp.Ordered for < and >; a local union freezes the type set.

## Why

The cmp documentation defines Ordered as the constraint permitting any type that supports the comparison operators and states that future releases adding ordered types will modify the constraint. A hand-written union of int and float64 silently excludes strings, named types, and anything added later, so callers copy their values into a supported type. The standard constraint also pairs with cmp.Compare and cmp.Less, which define NaN behavior consistently.

## Bad

```go
type MyOrdered interface {
    ~int | ~float64
}

func Max[T MyOrdered](xs []T) T {
    best := xs[0]
    for _, x := range xs[1:] {
        if x > best {
            best = x
        }
    }
    return best
}
```

## Good

```go
import "cmp"

func Max[T cmp.Ordered](xs []T) T {
    best := xs[0]
    for _, x := range xs[1:] {
        if x > best {
            best = x
        }
    }
    return best
}
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - when a constraint is warranted
- [go-gen-containers](gen-containers.md) - containers that use the same constraint
