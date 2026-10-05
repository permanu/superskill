---
id: go-perf-http-client-reuse
lang: go
prefix: perf
title: Create HTTP clients and transports once and reuse them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.Client, http.Transport, connection pool, reuse]
  files: ["**/*.go"]
  symbols: [http.Client, http.Transport]
related: [go-perf-regexp-compile-once, go-conc-sync-function]
sources:
  - title: Package net/http - Clients and Transports
    url: https://pkg.go.dev/net/http
  - title: Package net/http - DefaultTransport
    url: https://pkg.go.dev/net/http
---
> Build the configured client once; a per-call Transport starts a fresh pool.

## Why

The net/http documentation says Clients and Transports are safe for concurrent use by multiple goroutines and should be created once and re-used for efficiency, and DefaultTransport is documented as caching connections for reuse by subsequent calls. A client that constructs its own Transport per call starts a new pool each time, so keep-alive connections never span requests. A bare client happens to share DefaultTransport because a nil Transport falls back to it, which hides the problem until a Transport is configured.

## Bad

```go
import (
    "net/http"
    "time"
)

func get(url string) (*http.Response, error) {
    client := &http.Client{
        Transport: &http.Transport{IdleConnTimeout: 30 * time.Second},
        Timeout:   10 * time.Second,
    }
    return client.Get(url)
}
```

## Good

```go
import (
    "net/http"
    "time"
)

var httpClient = &http.Client{
    Transport: &http.Transport{IdleConnTimeout: 30 * time.Second},
    Timeout:   10 * time.Second,
}

func get(url string) (*http.Response, error) {
    return httpClient.Get(url)
}
```

## See Also

- [go-perf-regexp-compile-once](perf-regexp-compile-once.md) - hoisting other reusable values
- [go-conc-sync-function](conc-sync-function.md) - keeping the call itself synchronous
