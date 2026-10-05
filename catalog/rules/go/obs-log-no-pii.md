---
id: go-obs-log-no-pii
lang: go
prefix: obs
title: Keep secrets and personal data out of logs with LogValuer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, secrets, PII, LogValuer, redaction]
  files: ["**/*.go"]
  symbols: [slog.LogValuer]
related: [go-obs-log-value-deferred, go-obs-slog-structured]
sources:
  - title: Package log/slog - LogValuer
    url: https://pkg.go.dev/log/slog
  - title: Google Go Style Best Practices - Logging errors
    url: https://google.github.io/styleguide/go/best-practices
---
> Give sensitive types a LogValue that redacts, instead of trusting every call site.

## Why

The style guide warns that many log sinks are not appropriate destinations for sensitive end-user information, and the slog documentation shows LogValuer as the mechanism for redacting secrets. Logging a struct by value prints every field, so one careless call leaks a password or token into durable storage. A LogValue method puts the redaction in the type, where every future call inherits it.

## Bad

```go
type User struct {
    Name     string
    Password string
}

func login(u User) {
    slog.Info("login", "user", u)
}
```

## Good

```go
type User struct {
    Name     string
    Password string
}

func (u User) LogValue() slog.Value {
    return slog.GroupValue(slog.String("name", u.Name))
}

func login(u User) {
    slog.Info("login", "user", u)
}
```

## See Also

- [go-obs-log-value-deferred](obs-log-value-deferred.md) - the other reason to implement LogValue
- [go-obs-slog-structured](obs-slog-structured.md) - the attribute model LogValue plugs into
