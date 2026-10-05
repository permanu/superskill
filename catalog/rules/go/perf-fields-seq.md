---
id: go-perf-fields-seq
lang: go
prefix: perf
title: Iterate split strings with the Seq helpers instead of building slices
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strings.FieldsSeq, iterator, split, allocation]
  files: ["**/*.go"]
  symbols: [strings.FieldsSeq, strings.SplitSeq]
related: [go-perf-json-decoder-stream, go-mem-slice-preallocate]
sources:
  - title: Package strings - FieldsSeq
    url: https://pkg.go.dev/strings
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Walk words with FieldsSeq or SplitSeq when the slice itself is not needed.

## Why

The strings documentation states that FieldsSeq yields the same substrings as Fields but without constructing the slice, and the same holds for the Split family. When the caller only counts, filters, or transforms elements, the []string allocation and its copy of the input are pure overhead. The iterator form also lets a loop stop early without materializing the rest.

## Bad

```go
func countWords(s string) int {
    return len(strings.Fields(s))
}
```

## Good

```go
func countWords(s string) int {
    n := 0
    for range strings.FieldsSeq(s) {
        n++
    }
    return n
}
```

## See Also

- [go-perf-json-decoder-stream](perf-json-decoder-stream.md) - the same streaming idea for JSON
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - when the slice is genuinely needed
