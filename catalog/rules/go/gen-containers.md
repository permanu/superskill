---
id: go-gen-containers
lang: go
prefix: gen
title: Parameterize general-purpose data structures over their element type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, container, stack, type parameter]
  files: ["**/*.go"]
  symbols: []
related: [go-gen-write-code-first, go-gen-cmp-ordered]
sources:
  - title: When To Use Generics - General purpose data structures
    url: https://go.dev/blog/when-generics
  - title: Package slices
    url: https://pkg.go.dev/slices
---
> Give containers a type parameter instead of storing any and asserting on read.

## Why

The generics guide calls general-purpose data structures a good use of type parameters: the code is independent of the element type, and replacing an interface with a type parameter stores data more efficiently, avoids type assertions, and stays fully type-checked. An any-based stack defers every type error to a runtime assertion at the call site. The slices package demonstrates the same model, parameterized over element and slice types.

## Bad

```go
type Stack struct{ items []any }

func (s *Stack) Push(v any) { s.items = append(s.items, v) }

func (s *Stack) Pop() (any, bool) {
    if len(s.items) == 0 {
        return nil, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}
```

## Good

```go
type Stack[T any] struct{ items []T }

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - the guideline that justifies this case
- [go-gen-cmp-ordered](gen-cmp-ordered.md) - constraining the element type when ordering matters
