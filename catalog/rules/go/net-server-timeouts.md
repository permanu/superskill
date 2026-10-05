---
id: go-net-server-timeouts
lang: go
prefix: net
title: Set a read header timeout on every http.Server
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.Server, ReadHeaderTimeout, timeout, slowloris]
  files: ["**/*.go"]
  symbols: [http.Server]
related: [go-net-server-shutdown, go-net-handler-context]
sources:
  - title: Package net/http - Server.ReadHeaderTimeout
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Server.ReadTimeout
    url: https://pkg.go.dev/net/http
---
> Zero timeouts leave a stalled client holding the connection forever.

## Why

The net/http documentation says ReadHeaderTimeout is the amount of time allowed to read request headers, and that most users will prefer it over ReadTimeout because ReadTimeout does not let handlers make per-request decisions on each request body's deadline or upload rate. The field docs add that if it is zero the value of ReadTimeout is used, and if both are zero there is no timeout. A server with no header timeout lets one slow client hold a connection open indefinitely.

## Bad

```go
import "net/http"

func serve(handler http.Handler) error {
    return http.ListenAndServe(":8080", handler)
}
```

## Good

```go
import (
    "net/http"
    "time"
)

func serve(handler http.Handler) error {
    srv := &http.Server{
        Addr:              ":8080",
        Handler:           handler,
        ReadHeaderTimeout: 5 * time.Second,
    }
    return srv.ListenAndServe()
}
```

## See Also

- [go-net-server-shutdown](net-server-shutdown.md) - stopping the server cleanly
- [go-net-handler-context](net-handler-context.md) - bounding the work after the headers arrive
