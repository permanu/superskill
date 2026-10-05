---
id: go-test-helper
lang: go
prefix: test
title: Mark test helpers with t.Helper so failures point at the caller
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [test helper, t.Helper, failure location]
  files: ["**/*_test.go"]
  symbols: [testing.T.Helper]
related: [go-test-failure-message, go-test-cleanup]
sources:
  - title: Go Wiki - Go Test Comments
    url: https://go.dev/wiki/TestComments
  - title: Package testing - T.Helper
    url: https://pkg.go.dev/testing
---
> Call t.Helper at the top of every test helper that takes a testing.T.

## Why

Without the marker, a failure inside a helper is reported at the helper's line, so the log points at shared code instead of the test case that supplied the bad input. The test comments ask helpers to call t.Helper so failures are attributed to the call site, and the testing package skips marked functions when computing file and line. The cost is one line per helper.

## Bad

```go
func readFile(t *testing.T, name string) string {
    data, err := os.ReadFile(name)
    if err != nil {
        t.Fatalf("read %s: %v", name, err)
    }
    return string(data)
}
```

## Good

```go
func readFile(t *testing.T, name string) string {
    t.Helper()
    data, err := os.ReadFile(name)
    if err != nil {
        t.Fatalf("read %s: %v", name, err)
    }
    return string(data)
}
```

## See Also

- [go-test-failure-message](test-failure-message.md) - the message the caller sees
- [go-test-cleanup](test-cleanup.md) - helpers that register cleanup
