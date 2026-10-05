---
id: go-mem-slices-sort
lang: go
prefix: mem
title: Sort with slices.Sort and slices.SortFunc, not sort.Slice
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sort, slices, SortFunc, reflection]
  files: ["**/*.go"]
  symbols: [slices.Sort, slices.SortFunc]
related: [go-mem-min-max, go-mem-slice-preallocate]
sources:
  - title: Package slices - Sort and SortFunc
    url: https://pkg.go.dev/slices
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Call slices.Sort for ordered types and slices.SortFunc for a comparator.

## Why

slices.Sort is generic over ordered element types, so the element type is checked at build time and the comparison is inlined; sort.Slice takes a closure and reaches the elements through reflection. The slices documentation defines Sort for any ordered type and SortFunc for a strict weak ordering. The helpers also cover IsSorted, Min, Max, and BinarySearch on the same slice.

## Bad

```go
func sortNames(names []string) {
    sort.Slice(names, func(i, j int) bool { return names[i] < names[j] })
}
```

## Good

```go
func sortNames(names []string) {
    slices.Sort(names)
}
```

## See Also

- [go-mem-min-max](mem-min-max.md) - ordered-type builtins that pair with these helpers
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - preparing the slice before sorting
