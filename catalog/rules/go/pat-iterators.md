---
id: go-pat-iterators
lang: go
prefix: pat
title: Expose sequences as iterators instead of materialized slices
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [iterators, range over func, yield, sequences]
  files: ["**/*.go"]
  symbols: []
related: [go-perf-fields-seq, go-pat-pipelines]
sources:
  - title: The Go Programming Language Specification - For statements
    url: https://go.dev/ref/spec
  - title: Package slices - Values
    url: https://pkg.go.dev/slices
---
> A yield function streams values and stops when the caller is done.

## Why

The specification says a for statement with a range clause can iterate values passed to an iterator function's yield function, and that the range expression may be a function with a specific signature. The slice form allocates the whole sequence before the caller sees the first element. The yield form streams values and stops early when the loop body stops receiving.

## Bad

```go
func range3() []int {
    return []int{0, 1, 2}
}

func use() {
    for v := range range3() {
        _ = v
    }
}
```

## Good

```go
func range3(yield func(int) bool) {
    for i := 0; i < 3; i++ {
        if !yield(i) {
            return
        }
    }
}

func use() {
    for v := range range3 {
        _ = v
    }
}
```

## See Also

- [go-perf-fields-seq](perf-fields-seq.md) - the standard library iterators built this way
- [go-pat-pipelines](pat-pipelines.md) - the concurrent cousin of streaming values
