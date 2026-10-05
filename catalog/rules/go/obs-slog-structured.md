---
id: go-obs-slog-structured
lang: go
prefix: obs
title: Log key-value attributes with slog instead of formatted strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slog, structured logging, log.Printf, attributes]
  files: ["**/*.go"]
  symbols: [slog.Error, log.Printf]
related: [go-obs-slog-context, go-obs-slog-with-attrs, go-err-log-once]
sources:
  - title: Structured Logging with slog
    url: https://go.dev/blog/slog
  - title: Package log/slog
    url: https://pkg.go.dev/log/slog
---
> Emit attributes, not interpolated text, so logs can be parsed and filtered.

## Why

The slog article says structured logs use key-value pairs so they can be parsed, filtered, searched, and analyzed quickly and reliably. Formatting values into a message makes each fact part of an opaque string that no query can target, and it loses the type of the value. slog carries the message plus typed attributes and routes them through a configurable handler.

## Bad

```go
func handle(user string, err error) {
    log.Printf("user %s failed: %v", user, err)
}
```

## Good

```go
func handle(user string, err error) {
    slog.Error("request failed", "user", user, "err", err)
}
```

## See Also

- [go-obs-slog-context](obs-slog-context.md) - attaching the request context to the record
- [go-obs-slog-with-attrs](obs-slog-with-attrs.md) - factoring out attributes shared by many calls
- [go-err-log-once](err-log-once.md) - where in the call stack to log at all
