---
id: go-obs-slog-with-attrs
lang: go
prefix: obs
title: Bind repeated attributes once with Logger.With
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slog, With, attributes, reuse]
  files: ["**/*.go"]
  symbols: [slog.With, slog.Logger.With]
related: [go-obs-slog-structured, go-obs-slog-handler]
sources:
  - title: Package log/slog - Logger.With
    url: https://pkg.go.dev/log/slog
  - title: Structured Logging with slog - Performance
    url: https://go.dev/blog/slog
---
> Attach request-scoped attributes to a logger, not to every call.

## Why

The slog article notes that With factors out common attributes and that handlers format them once rather than at each logging call, which matters when the attribute is large. Repeating the same key-value pairs on every line invites drift where one call spells the key differently. A logger derived with With carries the identity of the request into every record it emits.

## Bad

```go
func handle(id, region string) {
    slog.Info("started", "id", id, "region", region)
    slog.Info("finished", "id", id, "region", region)
}
```

## Good

```go
func handle(id, region string) {
    logger := slog.With("id", id, "region", region)
    logger.Info("started")
    logger.Info("finished")
}
```

## See Also

- [go-obs-slog-structured](obs-slog-structured.md) - the attribute model behind With
- [go-obs-slog-handler](obs-slog-handler.md) - the handler that formats them once
