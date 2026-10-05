---
id: go-test-t-context
lang: go
prefix: test
title: Use t.Context for work that must stop when the test ends
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [t.Context, context, cancellation, test cleanup]
  files: ["**/*_test.go"]
  symbols: [testing.T.Context]
related: [go-test-cleanup, go-conc-context-not-in-struct]
sources:
  - title: Package testing - T.Context
    url: https://pkg.go.dev/testing
  - title: Package context
    url: https://pkg.go.dev/context
---
> Take t.Context instead of context.Background so background work is canceled at test end.

## Why

The testing package's Context returns a context canceled just before the test's cleanup functions run, which gives goroutines and clients a signal to stop before the process moves on. context.Background never cancels, so a leaked watcher keeps running into the next test and can make unrelated tests flaky. The same context also carries the test's lifetime into libraries that take a context.

## Bad

```go
func TestFetch(t *testing.T) {
    ctx := context.Background()
    if err := fetch(ctx); err != nil {
        t.Fatal(err)
    }
}

func fetch(ctx context.Context) error { return nil }
```

## Good

```go
func TestFetch(t *testing.T) {
    if err := fetch(t.Context()); err != nil {
        t.Fatal(err)
    }
}

func fetch(ctx context.Context) error { return nil }
```

## See Also

- [go-test-cleanup](test-cleanup.md) - the cleanup the context cancels before
- [go-conc-context-not-in-struct](conc-context-not-in-struct.md) - passing the context per call
