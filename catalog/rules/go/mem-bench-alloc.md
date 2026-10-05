---
id: go-mem-bench-alloc
lang: go
prefix: mem
title: Measure allocations in benchmarks with ReportAllocs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [benchmark, allocations, ReportAllocs, memory]
  files: ["**/*_test.go"]
  symbols: [testing.B.ReportAllocs]
related: [go-test-benchmark-loop, go-mem-slice-preallocate]
sources:
  - title: Package testing - B.ReportAllocs
    url: https://pkg.go.dev/testing
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Turn on allocation reporting before optimizing memory use.

## Why

The testing package's ReportAllocs enables malloc statistics for the benchmark, which is the only way to see allocations per operation in the benchmark output. A timing-only benchmark cannot distinguish a faster algorithm from a lucky cache, and allocation changes are invisible without the counter. The release notes show that allocator behavior changes between toolchains, so measure on the toolchain you ship.

## Bad

```go
func BenchmarkJoin(b *testing.B) {
    for b.Loop() {
        _ = join()
    }
}

func join() string { return "" }
```

## Good

```go
func BenchmarkJoin(b *testing.B) {
    b.ReportAllocs()
    for b.Loop() {
        _ = join()
    }
}

func join() string { return "" }
```

## See Also

- [go-test-benchmark-loop](test-benchmark-loop.md) - the benchmark loop this decorates
- [go-mem-slice-preallocate](mem-slice-preallocate.md) - the fix allocation counts usually justify
