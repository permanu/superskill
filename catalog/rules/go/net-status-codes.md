---
id: go-net-status-codes
lang: go
prefix: net
title: Write responses with the http.Status constants
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [StatusOK, WriteHeader, status codes]
  files: ["**/*.go"]
  symbols: [http.StatusOK, http.WriteHeader]
related: [go-net-method-constants, go-net-mux-patterns]
sources:
  - title: Package net/http - StatusText
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Status constants
    url: https://pkg.go.dev/net/http
---
> Named status constants read as intent; a bare integer can be a typo.

## Why

The net/http package defines constants such as StatusOK and StatusNotFound, and its StatusText function maps a code to its text. A bare 200 or 404 forces every reader to translate numbers, and a mistyped code such as 204 for a body-carrying success compiles without complaint. The named constants make the intended status visible at the call site.

## Bad

```go
import "net/http"

func ok(w http.ResponseWriter) { w.WriteHeader(200) }
```

## Good

```go
import "net/http"

func ok(w http.ResponseWriter) { w.WriteHeader(http.StatusOK) }
```

## See Also

- [go-net-method-constants](net-method-constants.md) - the same convention for request methods
- [go-net-mux-patterns](net-mux-patterns.md) - where the status gets decided
