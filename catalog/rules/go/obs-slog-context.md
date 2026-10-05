---
id: go-obs-slog-context
lang: go
prefix: obs
title: Pass the request context to slog with the Context methods
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slog, context, trace id, InfoContext]
  files: ["**/*.go"]
  symbols: [slog.InfoContext, slog.ErrorContext]
related: [go-obs-slog-structured, go-err-context-first-param]
sources:
  - title: Package log/slog - Contexts
    url: https://pkg.go.dev/log/slog
  - title: Structured Logging with slog
    url: https://go.dev/blog/slog
---
> Use InfoContext and ErrorContext whenever a context is in scope.

## Why

The slog documentation recommends passing a context to an output method if one is available, and the article explains why: a handler can extract context information such as trace IDs so every record joins the request's trace. The plain methods silently use context.Background, so the correlation is lost before any handler can see it. Passing the context also keeps log lines consistent with the request that produced them.

## Bad

```go
func handle(ctx context.Context, id string) {
    slog.Info("handling", "id", id)
}
```

## Good

```go
func handle(ctx context.Context, id string) {
    slog.InfoContext(ctx, "handling", "id", id)
}
```

## See Also

- [go-obs-slog-structured](obs-slog-structured.md) - the attributes these methods carry
- [go-err-context-first-param](err-context-first-param.md) - how the context reached this function
