---
id: go-mem-pass-values
lang: go
prefix: mem
title: Pass small values instead of pointers when nothing is mutated
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer, parameters, copying, escape]
  files: ["**/*.go"]
  symbols: []
related: [go-mem-sync-pool, go-api-pointer-to-interface]
sources:
  - title: Go Code Review Comments - Pass Values
    url: https://go.dev/wiki/CodeReviewComments
  - title: Go FAQ - When are function parameters passed by value?
    url: https://go.dev/doc/faq
---
> Take the value when the body only reads it; pointers are for mutation and large structs.

## Why

A pointer to a small value adds indirection, can force the value to escape to the heap, and implies the function may modify the caller's data. The review guide says not to pass pointers just to save a few bytes and calls out *string and *io.Reader specifically. Pass a pointer when the function mutates, the struct is large, or the type contains a lock.

## Bad

```go
type Point struct{ X, Y int }

func scale(p *Point, f int) Point {
    return Point{X: p.X * f, Y: p.Y * f}
}
```

## Good

```go
type Point struct{ X, Y int }

func scale(p Point, f int) Point {
    return Point{X: p.X * f, Y: p.Y * f}
}
```

## See Also

- [go-mem-sync-pool](mem-sync-pool.md) - reusing buffers instead of passing them around
- [go-api-pointer-to-interface](api-pointer-to-interface.md) - the pointer-to-interface special case
