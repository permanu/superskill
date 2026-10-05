---
id: go-net-server-shutdown
lang: go
prefix: net
title: Shut servers down with Server.Shutdown, not Close
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.Server, Shutdown, graceful, Close]
  files: ["**/*.go"]
  symbols: [http.Server.Shutdown]
related: [go-net-server-timeouts, go-conc-goroutine-lifetime]
sources:
  - title: Package net/http - Server.Shutdown
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Server.Close
    url: https://pkg.go.dev/net/http
---
> Shutdown drains active connections; Close drops them mid-request.

## Why

The net/http documentation says Shutdown gracefully shuts down the server without interrupting any active connections, closing listeners first, then idle connections, and then waiting for connections to return to idle. It also notes that Serve and ListenAndServe return ErrServerClosed immediately, so the main goroutine can wait for Shutdown to finish. Close instead closes every connection at once, cutting off in-flight requests.

## Bad

```go
import "net/http"

func stop(srv *http.Server) error {
    return srv.Close()
}
```

## Good

```go
import (
    "context"
    "net/http"
)

func stop(ctx context.Context, srv *http.Server) error {
    return srv.Shutdown(ctx)
}
```

## See Also

- [go-net-server-timeouts](net-server-timeouts.md) - bounding the requests Shutdown waits for
- [go-conc-goroutine-lifetime](conc-goroutine-lifetime.md) - the lifecycle discipline behind a clean stop
