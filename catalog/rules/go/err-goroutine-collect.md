---
id: go-err-goroutine-collect
lang: go
prefix: err
title: Collect the errors of every goroutine you start and return them to the caller
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goroutine, error, WaitGroup, channel, errgroup]
  files: ["**/*.go"]
  symbols: [sync.WaitGroup, errors.Join]
related: [go-err-join, go-err-context-first-param, go-err-retry-transient]
sources:
  - title: Go Code Review Comments - Goroutine Lifetimes
    url: https://go.dev/wiki/CodeReviewComments
  - title: errgroup package
    url: https://pkg.go.dev/golang.org/x/sync/errgroup
  - title: Package errors - Join
    url: https://pkg.go.dev/errors
---
> Send goroutine failures back to the caller through a channel, wait for completion, and merge them.

## Why

A goroutine has no caller to return to: if its error is not sent somewhere, the failure disappears and the program continues with missing results. Spawned work needs an explicit completion signal and a result path, so the caller can decide what to do. `errgroup` packages error collection with first-error cancellation for teams that accept the dependency; the standard-library pattern below is the direct equivalent.

## Bad

```go
func downloadAll(ctx context.Context, urls []string) {
    for _, url := range urls {
        go func() {
            if err := download(ctx, url); err != nil {
                fmt.Println("download failed:", err)
            }
        }()
    }
}

func download(ctx context.Context, url string) error { return nil }
```

## Good

```go
func downloadAll(ctx context.Context, urls []string) error {
    var wg sync.WaitGroup
    errs := make(chan error, len(urls))
    for _, url := range urls {
        wg.Add(1)
        go func() {
            defer wg.Done()
            errs <- download(ctx, url)
        }()
    }
    wg.Wait()
    close(errs)
    var joined []error
    for err := range errs {
        if err != nil {
            joined = append(joined, err)
        }
    }
    return errors.Join(joined...)
}

func download(ctx context.Context, url string) error { return nil }
```

## See Also

- [go-err-join](err-join.md) - merging the collected errors into one value
- [go-err-context-first-param](err-context-first-param.md) - the shared context that cancels the group
- [go-err-retry-transient](err-retry-transient.md) - retrying subtasks that fail transiently
