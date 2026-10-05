---
id: go-obs-log-value-deferred
lang: go
prefix: obs
title: Defer expensive log values with LogValuer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slog, LogValuer, performance, debug logging]
  files: ["**/*.go"]
  symbols: [slog.LogValuer, slog.Value]
related: [go-obs-log-no-pii, go-obs-slog-structured]
sources:
  - title: Package log/slog - Performance considerations
    url: https://pkg.go.dev/log/slog
  - title: Structured Logging with slog
    url: https://go.dev/blog/slog
---
> Wrap costly values in a LogValuer so disabled log calls never compute them.

## Why

The slog documentation warns that the arguments to a log call are always evaluated, even when the event is discarded, and recommends LogValuer so the value is computed only if the record is emitted. Calling a Snapshot or JSON-encoding method inline pays the cost on every request regardless of level. The method also keeps the call site clean, because the type decides how it wants to appear.

## Bad

```go
func debugState(s State) {
    slog.Debug("state", "snapshot", s.Snapshot())
}

type State struct{}

func (s State) Snapshot() string { return "" }
```

## Good

```go
func debugState(s State) {
    slog.Debug("state", "snapshot", s)
}

type State struct{}

func (s State) Snapshot() string { return "" }

func (s State) LogValue() slog.Value { return slog.StringValue(s.Snapshot()) }
```

## See Also

- [go-obs-log-no-pii](obs-log-no-pii.md) - the redaction use of the same interface
- [go-obs-slog-structured](obs-slog-structured.md) - where the value lands in the record
