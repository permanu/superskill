---
id: go-test-cleanup
lang: go
prefix: test
title: Release test resources with t.Cleanup, not defer, in helpers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Cleanup, defer, test helper, teardown]
  files: ["**/*_test.go"]
  symbols: [testing.T.Cleanup]
related: [go-test-helper, go-test-tempdir]
sources:
  - title: Package testing - T.Cleanup
    url: https://pkg.go.dev/testing
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
---
> Register teardown with t.Cleanup so it runs after the test, not when the helper returns.

## Why

A defer inside a helper runs when the helper returns, which is usually before the test body has used the resource. t.Cleanup registers the function on the test instead, and the testing package runs it after the test and all its subtests complete, in last-added-first-called order. It also works from helpers that never see the caller's deferred stack.

## Bad

```go
func newFixture(t *testing.T) *os.File {
    f, err := os.CreateTemp("", "fixture")
    if err != nil {
        t.Fatal(err)
    }
    defer f.Close()
    return f
}
```

## Good

```go
func newFixture(t *testing.T) *os.File {
    f, err := os.CreateTemp("", "fixture")
    if err != nil {
        t.Fatal(err)
    }
    t.Cleanup(func() {
        if err := f.Close(); err != nil {
            t.Errorf("close: %v", err)
        }
    })
    return f
}
```

## See Also

- [go-test-helper](test-helper.md) - marking the helper that registers cleanup
- [go-test-tempdir](test-tempdir.md) - the built-in cleanup for temporary directories
