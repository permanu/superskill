---
id: go-lint-lostcancel
lang: go
prefix: lint
title: Call every context cancel function on every path
severity: must
enforce: tool
tool: go vet:lostcancel
baseline: latest
status: verified
triggers:
  keywords: [context, cancel, leak, lostcancel, vet]
  files: ["**/*.go"]
  symbols: [context.WithCancel, context.WithTimeout]
related: [go-lint-copylocks, go-conc-select-cancel]
sources:
  - title: cmd/vet - lostcancel
    url: https://pkg.go.dev/cmd/vet
  - title: Package context - WithCancel
    url: https://pkg.go.dev/context
---
> Defer cancel immediately; a path that skips it leaks the context until the parent dies.

## Why

The context documentation states that failing to call the CancelFunc leaks the child and its children until the parent is canceled, and that vet checks the function is used on all control-flow paths. An early return that skips cancel keeps the timer and the parent's reference alive for the lifetime of the parent context. `defer cancel()` covers every path, including panics.

## Bad

```go
import "context"

func work(parent context.Context) error {
    ctx, cancel := context.WithCancel(parent)
    if err := do(ctx); err != nil {
        return err
    }
    cancel()
    return nil
}

func do(context.Context) error { return nil }
```

## Good

```go
import "context"

func work(parent context.Context) error {
    ctx, cancel := context.WithCancel(parent)
    defer cancel()
    return do(ctx)
}

func do(context.Context) error { return nil }
```

## See Also

- [go-lint-copylocks](lint-copylocks.md) - the other vet-reported resource hazard
- [go-conc-select-cancel](conc-select-cancel.md) - using the cancellation this registers
