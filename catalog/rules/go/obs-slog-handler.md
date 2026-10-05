---
id: go-obs-slog-handler
lang: go
prefix: obs
title: Configure the slog handler once at startup
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slog, handler, JSONHandler, SetDefault]
  files: ["**/*.go"]
  symbols: [slog.SetDefault, slog.NewJSONHandler]
related: [go-obs-slog-structured, go-obs-slog-with-attrs]
sources:
  - title: Package log/slog - HandlerOptions
    url: https://pkg.go.dev/log/slog
  - title: Structured Logging with slog
    url: https://go.dev/blog/slog
---
> Install one handler in main so every record has the same shape.

## Why

The slog documentation says the program's main function typically sets the handler's minimum level, and SetDefault also reroutes the classic log package through that handler. Without it, records go through the default text logger and any later call to the old log package produces a different format. One configured handler gives operators a single format, level policy, and output destination.

## Bad

```go
func main() {
    slog.Info("starting")
}
```

## Good

```go
func main() {
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))
    slog.Info("starting")
}
```

## See Also

- [go-obs-slog-structured](obs-slog-structured.md) - what the handler receives
- [go-obs-slog-with-attrs](obs-slog-with-attrs.md) - attributes the handler formats once
