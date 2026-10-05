---
id: go-perf-goroutineleak-test
lang: go
prefix: perf
title: Assert no leaked goroutines with the goroutineleak profile
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goroutineleak, profile, leak, test]
  files: ["**/*_test.go"]
  symbols: [pprof.Lookup]
related: [go-conc-goroutine-lifetime, go-conc-synctest]
sources:
  - title: Go Release Notes - Goroutine leak profile
    url: https://go.dev/doc/go1.27
  - title: Package runtime/pprof - Profile
    url: https://pkg.go.dev/runtime/pprof
---
> Snapshot the goroutineleak profile after exercising concurrent code.

## Why

The runtime now exposes a goroutineleak profile that reports goroutines blocked on concurrency primitives that can never become unblocked, using reachability to distinguish true leaks from idle goroutines. The leak-detection pass runs when the profile is written out, so the test snapshots it with Profile.WriteTo and then reads Profile.Count for the number of leaked stacks. An assertion in the test catches the leak while the change that caused it is still in front of the author.

## Bad

```go
func TestPool(t *testing.T) {
    runPool()
}

func runPool() {}
```

## Good

```go
import (
    "bytes"
    "runtime/pprof"
    "testing"
)

func TestPool(t *testing.T) {
    runPool()
    p := pprof.Lookup("goroutineleak")
    if p == nil {
        t.Fatal("goroutineleak profile unavailable")
    }
    var buf bytes.Buffer
    if err := p.WriteTo(&buf, 0); err != nil {
        t.Fatal(err)
    }
    if n := p.Count(); n > 0 {
        t.Errorf("leaked %d goroutines", n)
    }
}

func runPool() {}
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the structural fix for leaks
- [go-conc-synctest](conc-synctest.md) - deterministic concurrency tests that pair with this check
