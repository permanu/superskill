---
id: go-mem-clip-capacity
lang: go
prefix: mem
title: Clip capacity when returning a subslice of a larger buffer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [subslice, capacity, clip, retained memory]
  files: ["**/*.go"]
  symbols: [slices.Clip]
related: [go-mem-slices-clone, go-mem-append-alias, go-mem-slice-preallocate]
sources:
  - title: Package slices - Clip
    url: https://pkg.go.dev/slices
  - title: "Go Slices: usage and internals - A possible gotcha"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Clip the capacity so later appends cannot write into the parent buffer.

## Why

A subslice keeps the parent's capacity, so an append through it can overwrite the elements just past its length and can also keep the whole parent array alive. slices.Clip returns s[:len(s):len(s)], capping growth at the length while sharing the data. Use Clone instead when the caller may also mutate the elements.

## Bad

```go
func head(data []byte) []byte {
    return data[:16]
}
```

## Good

```go
func head(data []byte) []byte {
    return slices.Clip(data[:16])
}
```

## See Also

- [go-mem-slices-clone](mem-slices-clone.md) - copying when mutation is possible
- [go-mem-append-alias](mem-append-alias.md) - the overwrite this rule prevents
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - growing safely on the caller's side
