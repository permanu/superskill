---
id: go-net-method-constants
lang: go
prefix: net
title: Compare request methods with http.Method constants
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.MethodGet, method strings, comparison]
  files: ["**/*.go"]
  symbols: [http.MethodGet]
related: [go-net-status-codes, go-net-mux-patterns]
sources:
  - title: Package net/http - Methods
    url: https://pkg.go.dev/net/http
  - title: RFC 9110 - Method Registry
    url: https://www.rfc-editor.org/rfc/rfc9110.html
---
> A misspelled method string compiles and silently never matches.

## Why

The net/http package defines MethodGet, MethodPost, and the other common methods as constants, noting that they are defined in RFC 9110. A literal such as "get" or "GETT" compiles and never matches, and the failure appears only as a wrong response under load. The constants turn the method name into an identifier that tools can check and search.

## Bad

```go
func isRead(method string) bool { return method == "GET" }
```

## Good

```go
import "net/http"

func isRead(method string) bool { return method == http.MethodGet }
```

## See Also

- [go-net-status-codes](net-status-codes.md) - the same convention for response codes
- [go-net-mux-patterns](net-mux-patterns.md) - routing by method without comparisons
