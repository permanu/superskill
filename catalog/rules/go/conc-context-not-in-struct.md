---
id: go-conc-context-not-in-struct
lang: go
prefix: conc
title: Pass context per call instead of storing it in a struct
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [context, struct, parameter, lifetime]
  files: ["**/*.go"]
  symbols: [context.Context]
related: [go-err-context-first-param, go-conc-select-cancel]
sources:
  - title: Package context
    url: https://pkg.go.dev/context
  - title: Go Code Review Comments - Contexts
    url: https://go.dev/wiki/CodeReviewComments
---
> Never store context.Context in a struct; add a ctx parameter to each method that needs it.

## Why

A context stored at construction time freezes the deadline and cancellation of one caller and silently serves later calls with a stale lifetime. The context package forbids storing contexts in struct types so that propagation stays visible and tools can check it; the single exception is a method whose signature must match a third-party interface. Request-scoped data belongs to the call, not to the object.

## Bad

```go
type Server struct {
    ctx context.Context
}

func (s *Server) Ping() error {
    select {
    case <-s.ctx.Done():
        return s.ctx.Err()
    default:
        return nil
    }
}
```

## Good

```go
type Server struct{}

func (s *Server) Ping(ctx context.Context) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        return nil
    }
}
```

## See Also

- [go-err-context-first-param](err-context-first-param.md) - the first-parameter convention
- [go-conc-select-cancel](conc-select-cancel.md) - using the per-call context in blocking loops
