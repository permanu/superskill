---
id: go-lint-slog-pairs
lang: go
prefix: lint
title: Pass slog key-value arguments in complete pairs
severity: should
enforce: tool
tool: go vet:slog
baseline: latest
status: verified
triggers:
  keywords: [slog, attributes, vet, key value]
  files: ["**/*.go"]
  symbols: [slog.Info]
related: [go-obs-slog-structured, go-lint-printf-verbs]
sources:
  - title: cmd/vet - slog
    url: https://pkg.go.dev/cmd/vet
  - title: Package log/slog - Attrs and Values
    url: https://pkg.go.dev/log/slog
---
> Give every key a value; a trailing key produces a malformed record.

## Why

The vet documentation lists slog as the check for invalid structured logging calls, and the slog documentation describes how attribute arguments are processed. A string argument that is not followed by a value is treated as a value with key "!BADKEY", so a call ending after a key renders as !BADKEY=method instead of the intended attribute. Complete pairs or explicit Attr values keep the record well-formed.

## Bad

```go
import "log/slog"

func logRequest(id string) {
    slog.Info("request", "id", id, "method")
}
```

## Good

```go
import "log/slog"

func logRequest(id string) {
    slog.Info("request", "id", id, "method", "GET")
}
```

## See Also

- [go-obs-slog-structured](obs-slog-structured.md) - why the attributes exist
- [go-lint-printf-verbs](lint-printf-verbs.md) - the printf analogue of argument checking
