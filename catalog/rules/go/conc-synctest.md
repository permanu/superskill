---
id: go-conc-synctest
lang: go
prefix: conc
title: Test concurrent code with testing/synctest instead of sleeps
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [synctest, test, sleep, goroutine, determinism]
  files: ["**/*.go"]
  symbols: [synctest.Test, synctest.Wait]
related: [go-conc-goroutine-lifetime, go-conc-select-cancel]
sources:
  - title: Package testing/synctest
    url: https://pkg.go.dev/testing/synctest
  - title: Package testing
    url: https://pkg.go.dev/testing
---
> Run goroutine tests in a synctest bubble and wait for durable blocking instead of sleeping.

## Why

Sleep-based synchronization makes tests slow and flaky: the sleep must outlast the work on the slowest machine and still fails under load. synctest runs the test in a bubble with a fake clock, and Wait returns when every other goroutine in the bubble is durably blocked, which makes the assertion deterministic. Time inside a bubble advances only when all goroutines are blocked, so timeouts are tested instantly.

## Bad

```go
func TestFetch(t *testing.T) {
    go fetch()
    time.Sleep(100 * time.Millisecond)
    if !done() {
        t.Fatal("fetch did not finish")
    }
}

func fetch() {}

func done() bool { return true }
```

## Good

```go
func TestFetch(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        go fetch()
        synctest.Wait()
        if !done() {
            t.Fatal("fetch did not finish")
        }
    })
}

func fetch() {}

func done() bool { return true }
```

## See Also

- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the goroutines the bubble tracks
- [go-conc-select-cancel](conc-select-cancel.md) - timeouts that synctest can exercise instantly
