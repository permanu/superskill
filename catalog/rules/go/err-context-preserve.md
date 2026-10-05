---
id: go-err-context-preserve
lang: go
prefix: err
title: Preserve the identity of context cancellation in returned errors
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [context, cancellation, deadline, errors.Is, shutdown]
  files: ["**/*.go"]
  symbols: [context.Canceled, context.DeadlineExceeded]
related: [go-err-context-first-param, go-err-retry-transient, go-err-wrap-with-w]
sources:
  - title: Package context
    url: https://pkg.go.dev/context
  - title: Google Go Style Best Practices - Documentation
    url: https://google.github.io/styleguide/go/best-practices
---
> Return ctx.Err() or an error wrapping it; never replace cancellation with a new message.

## Why

Callers distinguish a canceled request from a failure with `errors.Is(err, context.Canceled)` and a missed deadline with `context.DeadlineExceeded`; shutdown logic and retry policy depend on that identity. A fresh `errors.New("operation timed out")` keeps the words and loses the meaning, so graceful shutdown reports failures that never happened. The convention for a function that takes a context is to return `ctx.Err()` when the context stops it.

## Bad

```go
func run(ctx context.Context, task func(context.Context) error) error {
    done := make(chan error, 1)
    go func() { done <- task(ctx) }()
    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return errors.New("operation timed out")
    }
}
```

## Good

```go
func run(ctx context.Context, task func(context.Context) error) error {
    done := make(chan error, 1)
    go func() { done <- task(ctx) }()
    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return fmt.Errorf("run task: %w", ctx.Err())
    }
}
```

## See Also

- [go-err-context-first-param](err-context-first-param.md) - where the context enters the call chain
- [go-err-retry-transient](err-retry-transient.md) - cancelation must stop the retry loop
- [go-err-wrap-with-w](err-wrap-with-w.md) - wrapping is how cancellation survives added context
