---
id: go-perf-slices-binary-search
lang: go
prefix: perf
title: Look up in a sorted slice with slices.BinarySearch
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [BinarySearch, sorted slice, lookup, log n]
  files: ["**/*.go"]
  symbols: [slices.BinarySearch]
related: [go-mem-slices-sort, go-perf-map-preallocate]
sources:
  - title: Package slices - BinarySearch
    url: https://pkg.go.dev/slices
  - title: Package slices - Sort
    url: https://pkg.go.dev/slices
---
> Binary-search sorted slices instead of scanning them per lookup.

## Why

The slices documentation defines BinarySearch as searching a sorted slice and returning either the earliest matching position or the position where the target would be inserted, so the O(log n) contract is explicit and the insertion point comes for free. A linear scan is O(n) per lookup and turns a hot read path into a quadratic workload. Sort the slice once with slices.Sort, then search it many times.

## Bad

```go
func contains(xs []int, target int) bool {
    for _, x := range xs {
        if x == target {
            return true
        }
    }
    return false
}
```

## Good

```go
func contains(xs []int, target int) bool {
    _, ok := slices.BinarySearch(xs, target)
    return ok
}
```

## See Also

- [go-mem-slices-sort](mem-slices-sort.md) - producing the sorted slice this requires
- [go-perf-map-preallocate](perf-map-preallocate.md) - the alternative when the data is a set
