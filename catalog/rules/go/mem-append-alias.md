---
id: go-mem-append-alias
lang: go
prefix: mem
title: Do not append to a slice whose backing array you do not own
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [append, aliasing, backing array, capacity]
  files: ["**/*.go"]
  symbols: [append]
related: [go-mem-slice-preallocate, go-mem-clip-capacity, go-mem-slices-clone]
sources:
  - title: "Arrays, slices (and strings): The mechanics of append"
    url: https://go.dev/blog/slices
  - title: Package builtin - append
    url: https://pkg.go.dev/builtin
---
> Copy before appending when the destination's capacity may cover the caller's data.

## Why

append writes into the existing backing array whenever capacity allows, so extending a slice that a caller still owns silently overwrites the elements just past its length. The append article shows reallocation only when capacity is exhausted, which means the bug appears and disappears with input sizes. Building the result in a fresh slice makes ownership explicit and the behavior independent of capacity.

## Bad

```go
func extend(prefix []int, extra []int) []int {
    return append(prefix, extra...)
}
```

## Good

```go
func extend(prefix []int, extra []int) []int {
    out := make([]int, 0, len(prefix)+len(extra))
    out = append(out, prefix...)
    out = append(out, extra...)
    return out
}
```

## See Also

- [go-mem-clip-capacity](mem-clip-capacity.md) - shrinking capacity so appends cannot reach foreign data
- [go-mem-slices-clone](mem-slices-clone.md) - cloning instead of rebuilding
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - the capacity choice made here
