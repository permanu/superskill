---
id: go-obs-log-levels
lang: go
prefix: obs
title: Reserve the Error level for failures that need action
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log level, Error, Warn, actionability, alerts]
  files: ["**/*.go"]
  symbols: [slog.Error, slog.Warn]
related: [go-obs-slog-structured, go-err-log-once]
sources:
  - title: Google Go Style Best Practices - Logging errors
    url: https://google.github.io/styleguide/go/best-practices
  - title: Package log/slog - Levels
    url: https://pkg.go.dev/log/slog
---
> Log handled degradation at Warn; save Error for events a human must act on.

## Why

The style guide says messages at the error level should be actionable rather than merely more serious than a warning, and to use error-level logging sparingly. Alerting pipelines treat Error as a page, so retries and fallbacks that succeed drown the real incidents in noise. slog's integer levels let a service pick its own threshold while keeping Error meaningful.

## Bad

```go
func fetch() error {
    err := try()
    slog.Error("retrying", "err", err)
    return retry()
}

func try() error { return nil }

func retry() error { return nil }
```

## Good

```go
func fetch() error {
    err := try()
    slog.Warn("retrying after transient failure", "err", err)
    return retry()
}

func try() error { return nil }

func retry() error { return nil }
```

## See Also

- [go-obs-slog-structured](obs-slog-structured.md) - the attributes carried with the level
- [go-err-log-once](err-log-once.md) - logging once, at the level that owns the outcome
