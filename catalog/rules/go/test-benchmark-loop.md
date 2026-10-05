---
id: go-test-benchmark-loop
lang: go
prefix: test
title: Write benchmarks with b.Loop instead of an explicit b.N loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [benchmark, b.Loop, b.N, timing]
  files: ["**/*_test.go"]
  symbols: [testing.B.Loop]
related: [go-test-example-output, go-test-keep-going]
sources:
  - title: Package testing - B.Loop
    url: https://pkg.go.dev/testing
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
---
> Drive benchmarks with for b.Loop(); leave b.N-style loops to legacy code.

## Why

The testing package documents B.Loop as the preferred form: it resets the timer on the first call, stops it when the loop ends, and keeps loop-body results alive so the compiler cannot optimize the measured code away. An explicit `for i := 0; i < b.N; i++` loop needs manual ResetTimer placement and runs the setup multiple times. New benchmarks should use Loop.

## Bad

```go
func BenchmarkParse(b *testing.B) {
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _ = Parse("42")
    }
}

func Parse(s string) int { return len(s) }
```

## Good

```go
func BenchmarkParse(b *testing.B) {
    for b.Loop() {
        _ = Parse("42")
    }
}

func Parse(s string) int { return len(s) }
```

## See Also

- [go-test-example-output](test-example-output.md) - the other runnable test form
- [go-test-keep-going](test-keep-going.md) - failure reporting in the same file
