---
id: go-net-handler-context
lang: go
prefix: net
title: Run handler work with the request context
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [r.Context, cancellation, handlers]
  files: ["**/*.go"]
  symbols: [http.Request.Context]
related: [go-net-request-with-context, go-conc-select-cancel]
sources:
  - title: Package net/http - Request.Context
    url: https://pkg.go.dev/net/http
  - title: Package context - Overview
    url: https://pkg.go.dev/context
---
> r.Context ends when the client leaves; Background never does.

## Why

The net/http documentation says that for incoming server requests the context is canceled when the client's connection closes, the request is canceled, or when the ServeHTTP method returns. Work started from context.Background ignores all three signals and keeps running after the client is gone. Using r.Context threads the request lifetime through every downstream call, so cancellation propagates automatically.

## Bad

```go
import (
    "context"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    work(context.Background())
}

func work(ctx context.Context) {}
```

## Good

```go
import (
    "context"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    work(r.Context())
}

func work(ctx context.Context) {}
```

## See Also

- [go-net-request-with-context](net-request-with-context.md) - carrying the same context outbound
- [go-conc-select-cancel](conc-select-cancel.md) - checking cancellation at every blocking point
