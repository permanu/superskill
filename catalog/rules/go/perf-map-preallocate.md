---
id: go-perf-map-preallocate
lang: go
prefix: perf
title: Size maps with make when the number of entries is known
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, make, capacity, allocation, rehash]
  files: ["**/*.go"]
  symbols: [make]
related: [go-perf-builder-grow, go-mem-slice-preallocate]
sources:
  - title: Package builtin - make
    url: https://pkg.go.dev/builtin
  - title: Go FAQ - Why are maps built in?
    url: https://go.dev/doc/faq
---
> Pass the expected entry count to make so the map does not grow by rehashing.

## Why

The make documentation says a map is allocated with enough space to hold the specified number of elements, so passing the count avoids incremental growth and rehashing as entries arrive. A zero-capacity map reallocates its buckets repeatedly while the loop fills it. The FAQ explains that maps are built in because a single excellent implementation matters, and that implementation still pays for growth you can predict.

## Bad

```go
func counts(words []string) map[string]int {
    m := map[string]int{}
    for _, w := range words {
        m[w]++
    }
    return m
}
```

## Good

```go
func counts(words []string) map[string]int {
    m := make(map[string]int, len(words))
    for _, w := range words {
        m[w]++
    }
    return m
}
```

## See Also

- [go-perf-builder-grow](perf-builder-grow.md) - reserving capacity in a string builder
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - the same reservation for slices
