---
id: go-err-retry-transient
lang: go
prefix: err
title: Retry only classified transient errors of idempotent operations, with cancellation-aware waits
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retry, transient, idempotent, backoff, context]
  files: ["**/*.go"]
  symbols: [errors.Is, time.After, ctx.Done]
related: [go-err-context-preserve, go-err-contract-minimal, go-err-context-first-param]
sources:
  - title: RFC 9110 - Idempotent Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
  - title: Package context
    url: https://pkg.go.dev/context
  - title: Package errors
    url: https://pkg.go.dev/errors
---
> Retry only idempotent work whose error is classified transient, with bounded attempts and ctx-aware waits.

## Why

RFC 9110 says a client should not automatically retry a non-idempotent request unless it can detect that the original was never applied, because a retried side effect can charge a card or place an order twice. Retrying every error also multiplies load during an outage. Waits must select on `ctx.Done()` so shutdown and deadlines still stop the loop, and attempts must be bounded so a permanent failure terminates.

## Bad

```go
func retry(ctx context.Context, op func(context.Context) error) error {
    var err error
    for i := 0; i < 5; i++ {
        err = op(ctx)
        if err == nil {
            return nil
        }
        time.Sleep(time.Second)
    }
    return err
}
```

## Good

```go
var errTransient = errors.New("transient")

func isTransient(err error) bool { return errors.Is(err, errTransient) }

func retry(ctx context.Context, op func(context.Context) error) error {
    var err error
    for attempt := 0; attempt < 5; attempt++ {
        err = op(ctx)
        if err == nil || !isTransient(err) {
            return err
        }
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(time.Duration(attempt+1) * 100 * time.Millisecond):
        }
    }
    return fmt.Errorf("after 5 attempts: %w", err)
}
```

## See Also

- [go-err-context-preserve](err-context-preserve.md) - returning cancellation unchanged from the wait
- [go-err-contract-minimal](err-contract-minimal.md) - the sentinel that classification matches on
- [go-err-context-first-param](err-context-first-param.md) - the context that bounds every attempt
