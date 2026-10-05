---
id: go-perf-builder-grow
lang: go
prefix: perf
title: Reserve builder capacity when the final string size is known
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strings.Builder, Grow, capacity, concatenation]
  files: ["**/*.go"]
  symbols: [strings.Builder.Grow]
related: [go-perf-builder-reset, go-perf-map-preallocate]
sources:
  - title: Package strings - Builder.Grow
    url: https://pkg.go.dev/strings
  - title: "Go Slices: usage and internals"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Call Grow before writing when the total byte count is known.

## Why

Builder.Grow guarantees space for another n bytes without another allocation, which turns a sequence of growth-and-copy reallocations into one allocation. The builder is backed by a byte slice, and the slices article shows how append grows that slice by reallocating and copying as it fills. Computing the size up front is cheap when the parts are already in hand.

## Bad

```go
func render(lines []string) string {
    var b strings.Builder
    for _, line := range lines {
        b.WriteString(line)
    }
    return b.String()
}
```

## Good

```go
func render(lines []string) string {
    var b strings.Builder
    n := 0
    for _, line := range lines {
        n += len(line)
    }
    b.Grow(n)
    for _, line := range lines {
        b.WriteString(line)
    }
    return b.String()
}
```

## See Also

- [go-perf-builder-reset](perf-builder-reset.md) - reusing the capacity across iterations
- [go-perf-map-preallocate](perf-map-preallocate.md) - the same reservation for maps
