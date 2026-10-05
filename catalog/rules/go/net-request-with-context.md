---
id: go-net-request-with-context
lang: go
prefix: net
title: Build outbound requests with NewRequestWithContext
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NewRequestWithContext, client timeout, cancellation]
  files: ["**/*.go"]
  symbols: [http.NewRequestWithContext]
related: [go-net-handler-context, go-anti-http-default-client]
sources:
  - title: Package net/http - NewRequestWithContext
    url: https://pkg.go.dev/net/http
  - title: Package context - Overview
    url: https://pkg.go.dev/context
---
> The context controls the whole outbound request, including its response.

## Why

The net/http documentation says that for an outgoing client request, the context controls the entire lifetime of a request and its response: obtaining a connection, sending the request, and reading the response headers and body. NewRequest builds a request with a background context, so a caller's timeout or cancellation never reaches the transport. NewRequestWithContext carries the deadline through connection acquisition and response reading.

## Bad

```go
import "net/http"

func get(url string) (*http.Request, error) {
    return http.NewRequest("GET", url, nil)
}
```

## Good

```go
import (
    "context"
    "net/http"
)

func get(ctx context.Context, url string) (*http.Request, error) {
    return http.NewRequestWithContext(ctx, "GET", url, nil)
}
```

## See Also

- [go-net-handler-context](net-handler-context.md) - the server side of the same context
- [go-anti-http-default-client](anti-http-default-client.md) - the client-level timeout that complements it
