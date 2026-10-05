---
id: go-anti-context-values
lang: go
prefix: anti
title: Do not pass function parameters through context values
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [context, Value, WithValue, parameters]
  files: ["**/*.go"]
  symbols: [context.Context.Value]
related: [go-err-context-first-param, go-obs-slog-context]
sources:
  - title: Package context - Context.Value
    url: https://pkg.go.dev/context
  - title: Package context - WithValue
    url: https://pkg.go.dev/context
---
> Values are for request-scoped data; real arguments belong in the signature.

## Why

The context documentation says to use context Values only for request-scoped data that transits processes and APIs, not for passing optional parameters to functions. A value fished out of the context has no static type, so every reader performs a runtime assertion and every caller must know the key by convention. Parameters keep the dependency visible in the signature, where the compiler checks it and where documentation can describe it.

## Bad

```go
import "context"

func userID(ctx context.Context) string {
    id, _ := ctx.Value("userID").(string)
    return id
}
```

## Good

```go
import "context"

func load(ctx context.Context, userID string) (string, error) {
    if err := ctx.Err(); err != nil {
        return "", err
    }
    return userID, nil
}
```

## See Also

- [go-err-context-first-param](err-context-first-param.md) - where the context belongs in a signature
- [go-obs-slog-context](obs-slog-context.md) - passing the context to logging instead of stuffing values into it
