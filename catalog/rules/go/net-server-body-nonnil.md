---
id: go-net-server-body-nonnil
lang: go
prefix: net
title: Read the server request body directly; it is never nil
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [r.Body, nil check, server request]
  files: ["**/*.go"]
  symbols: [http.Request.Body]
related: [go-net-handler-context, go-io-read-all]
sources:
  - title: Package net/http - Request.Body
    url: https://pkg.go.dev/net/http
  - title: Package io - EOF
    url: https://pkg.go.dev/io
---
> For server requests Body is always non-nil and returns EOF when empty.

## Why

The net/http documentation says that for server requests the Request Body is always non-nil but will return EOF immediately when no body is present. A nil check on r.Body therefore never fires, and the fallback it guards is dead code. Reading the body directly handles the empty case through the EOF the Reader contract already defines.

## Bad

```go
import "net/http"

func readBody(r *http.Request) ([]byte, error) {
    if r.Body == nil {
        return nil, nil
    }
    return nil, nil
}
```

## Good

```go
import (
    "io"
    "net/http"
)

func readBody(r *http.Request) ([]byte, error) {
    return io.ReadAll(r.Body)
}
```

## See Also

- [go-net-handler-context](net-handler-context.md) - the cancellation that governs the read
- [go-io-read-all](io-read-all.md) - the helper doing the reading
