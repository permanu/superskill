---
id: go-test-short-skip
lang: go
prefix: test
title: Guard slow tests with testing.Short and t.Skip
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [testing.Short, skip, integration, fast tests]
  files: ["**/*_test.go"]
  symbols: [testing.Short, testing.T.Skip]
related: [go-test-tempdir, go-test-parallel-subtests]
sources:
  - title: Package testing - Skipping
    url: https://pkg.go.dev/testing
  - title: Go Code Review Comments - Useful Test Failures
    url: https://go.dev/wiki/CodeReviewComments
---
> Let `go test -short` skip the tests that need real time or real services.

## Why

Slow tests train developers to avoid the suite, and integration tests that require a cluster cannot run on every save. The testing package's skipping section shows the idiom: check testing.Short and call t.Skip with a reason, so `go test -short` stays fast while the full run still executes everything. The skip reason appears in verbose output, which keeps the omission visible.

## Bad

```go
func TestIntegration(t *testing.T) {
    spinUpCluster()
}

func spinUpCluster() {}
```

## Good

```go
func TestIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test in short mode")
    }
    spinUpCluster()
}

func spinUpCluster() {}
```

## See Also

- [go-test-tempdir](test-tempdir.md) - keeping the fast path self-contained
- [go-test-parallel-subtests](test-parallel-subtests.md) - speeding up what still runs
