---
id: go-test-setenv
lang: go
prefix: test
title: Set environment variables with t.Setenv instead of os.Setenv
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Setenv, environment, parallel, restore]
  files: ["**/*_test.go"]
  symbols: [testing.T.Setenv]
related: [go-test-parallel-subtests, go-test-t-context]
sources:
  - title: Package testing - T.Setenv
    url: https://pkg.go.dev/testing
  - title: Package testing - T.Chdir
    url: https://pkg.go.dev/testing
---
> Mutate process environment through t.Setenv so it is restored and parallelism is checked.

## Why

The testing package's Setenv records the previous value and restores it in cleanup, and it panics when the test is parallel, which catches the process-global hazard instead of producing a flaky suite. A manual os.Setenv with defer misses panic paths and silently races with parallel tests. The same reasoning applies to t.Chdir for the working directory.

## Bad

```go
func TestLoad(t *testing.T) {
    os.Setenv("APP_MODE", "test")
    defer os.Unsetenv("APP_MODE")
    if mode() != "test" {
        t.Fatalf("mode = %q", mode())
    }
}

func mode() string { return os.Getenv("APP_MODE") }
```

## Good

```go
func TestLoad(t *testing.T) {
    t.Setenv("APP_MODE", "test")
    if mode() != "test" {
        t.Fatalf("mode = %q", mode())
    }
}

func mode() string { return os.Getenv("APP_MODE") }
```

## See Also

- [go-test-parallel-subtests](test-parallel-subtests.md) - why parallel tests cannot use process-global state
- [go-test-t-context](test-t-context.md) - the other per-test handle
