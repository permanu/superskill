---
id: go-anti-http-default-client
lang: go
prefix: anti
title: Do not use http.Get and the default client in services
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.Get, DefaultClient, timeout, production]
  files: ["**/*.go"]
  symbols: [http.Get, http.DefaultClient]
related: [go-anti-http-body-close, go-perf-http-client-reuse]
sources:
  - title: Package net/http - DefaultClient
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Client.Timeout
    url: https://pkg.go.dev/net/http
---
> A bare client has no timeout; build one with an explicit Timeout.

## Why

The net/http documentation states that DefaultClient is the default Client and is used by Get, Head, and Post, and the Client type documents that a Timeout of zero means no timeout. A request made through those helpers can therefore wait forever on a stalled peer, and no single call site can adjust the limit. Constructing one Client with an explicit Timeout puts the bound in one place and keeps it visible in the code.

## Bad

```go
import "net/http"

func fetch(url string) (*http.Response, error) {
    return http.Get(url)
}
```

## Good

```go
import (
    "net/http"
    "time"
)

var client = &http.Client{Timeout: 10 * time.Second}

func fetch(url string) (*http.Response, error) {
    return client.Get(url)
}
```

## See Also

- [go-anti-http-body-close](anti-http-body-close.md) - the leak that follows a successful request
- [go-perf-http-client-reuse](perf-http-client-reuse.md) - reusing one configured client for connection pooling
