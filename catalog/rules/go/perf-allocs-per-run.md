---
id: go-perf-allocs-per-run
lang: go
prefix: perf
title: Pin allocation budgets with testing.AllocsPerRun
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [AllocsPerRun, allocations, test, budget]
  files: ["**/*_test.go"]
  symbols: [testing.AllocsPerRun]
related: [go-mem-bench-alloc, go-test-table-driven]
sources:
  - title: Package testing - AllocsPerRun
    url: https://pkg.go.dev/testing
  - title: Package testing - B.ReportAllocs
    url: https://pkg.go.dev/testing
---
> Turn the allocation count into a test assertion so a regression fails CI.

## Why

AllocsPerRun returns the average number of allocations during calls to f, measured after a warm-up run with GOMAXPROCS pinned to one. That makes it a deterministic budget rather than a benchmark you have to remember to run and compare. B.ReportAllocs serves the same purpose inside benchmarks; a plain test assertion catches the regression on every `go test`.

## Bad

```go
func TestBuild(t *testing.T) {
    if got := build(); got == "" {
        t.Fatal("empty")
    }
}

func build() string { return "x" }
```

## Good

```go
func TestBuild(t *testing.T) {
    if got := build(); got == "" {
        t.Fatal("empty")
    }
    if n := testing.AllocsPerRun(100, func() { _ = build() }); n > 1 {
        t.Errorf("build allocates %.0f times; want <= 1", n)
    }
}

func build() string { return "x" }
```

## See Also

- [go-mem-bench-alloc](mem-bench-alloc.md) - allocation reporting in benchmarks
- [go-test-table-driven](test-table-driven.md) - the test style this assertion lives in
