---
id: go-mem-slices-clone
lang: go
prefix: mem
title: Clone a slice before handing it to a caller
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slice, clone, aliasing, ownership]
  files: ["**/*.go"]
  symbols: [slices.Clone]
related: [go-mem-clip-capacity, go-mem-append-alias, go-api-nil-vs-empty-slice]
sources:
  - title: Package slices - Clone
    url: https://pkg.go.dev/slices
  - title: "Go Slices: usage and internals - A possible gotcha"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Return a copy when the caller could outlive or mutate the slice.

## Why

A slice shares its backing array with every other slice over the same storage, so returning an internal one lets callers mutate state you still own. The slices article's gotcha shows the memory side: a small slice can keep a whole file alive because it still points into it. slices.Clone makes a fresh array, preserving nilness and cutting the retained memory.

## Bad

```go
type Buffer struct{ data []byte }

func (b *Buffer) Bytes() []byte { return b.data }
```

## Good

```go
type Buffer struct{ data []byte }

func (b *Buffer) Bytes() []byte { return slices.Clone(b.data) }
```

## See Also

- [go-mem-clip-capacity](mem-clip-capacity.md) - when the subslice itself is safe to return
- [go-mem-append-alias](mem-append-alias.md) - the mutation side of shared storage
- [go-api-nil-vs-empty-slice](api-nil-vs-empty-slice.md) - Clone preserves nilness
