---
id: go-net-mux-patterns
lang: go
prefix: net
title: Put methods and wildcards in ServeMux patterns
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ServeMux, patterns, method routing, wildcards]
  files: ["**/*.go"]
  symbols: [http.ServeMux]
related: [go-net-method-constants, go-net-handler-context]
sources:
  - title: Package net/http - ServeMux Patterns
    url: https://pkg.go.dev/net/http
  - title: Package net/http - ServeMux
    url: https://pkg.go.dev/net/http
---
> Method-qualified patterns move routing checks out of handler bodies.

## Why

The net/http documentation says ServeMux patterns can match the method, host, and path of a request, with examples such as "GET /static/" matching a GET request whose path begins with that prefix. Registering the method in the pattern removes the manual method check that every handler otherwise repeats and gets slightly wrong. Patterns can also capture path segments, so a handler no longer parses the URL by hand.

## Bad

```go
import "net/http"

func register(mux *http.ServeMux, h http.Handler) {
    mux.HandleFunc("/items/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        h.ServeHTTP(w, r)
    })
}
```

## Good

```go
import "net/http"

func register(mux *http.ServeMux, h http.Handler) {
    mux.Handle("GET /items/", h)
}
```

## See Also

- [go-net-method-constants](net-method-constants.md) - the constants the patterns mirror
- [go-net-handler-context](net-handler-context.md) - what each routed handler should do first
