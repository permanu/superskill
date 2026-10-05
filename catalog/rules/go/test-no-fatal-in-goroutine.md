---
id: go-test-no-fatal-in-goroutine
lang: go
prefix: test
title: Never call Fatal or FailNow from a goroutine started by a test
severity: must
enforce: tool
tool: go vet:testinggoroutine
baseline: latest
status: verified
triggers:
  keywords: [goroutine, t.Fatal, testing, FailNow]
  files: ["**/*_test.go"]
  symbols: [testing.T.Fatal, testing.T.FailNow]
related: [go-test-keep-going, go-conc-goroutine-lifetime]
sources:
  - title: Package testing - T.FailNow
    url: https://pkg.go.dev/testing
  - title: cmd/vet - testinggoroutine
    url: https://pkg.go.dev/cmd/vet
---
> Report goroutine failures through a channel and fail from the test goroutine.

## Why

FailNow ends the goroutine that calls it by calling runtime.Goexit, so a Fatal inside a spawned goroutine stops only that goroutine: the test continues, may pass, and the failure message can be lost. The testing package requires FailNow to be called from the goroutine running the test. The vet testinggoroutine check reports the mistake before it ships.

## Bad

```go
func TestAsync(t *testing.T) {
    go func() {
        if err := run(); err != nil {
            t.Fatal(err)
        }
    }()
}

func run() error { return nil }
```

## Good

```go
func TestAsync(t *testing.T) {
    errc := make(chan error, 1)
    go func() { errc <- run() }()
    if err := <-errc; err != nil {
        t.Fatal(err)
    }
}

func run() error { return nil }
```

## See Also

- [go-test-keep-going](test-keep-going.md) - choosing between Error and Fatal in the test goroutine
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - giving the goroutine a bounded exit
