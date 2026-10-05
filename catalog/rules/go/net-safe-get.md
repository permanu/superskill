---
id: go-net-safe-get
lang: go
prefix: net
title: Keep GET and HEAD handlers read-only
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [safe methods, GET, side effects, RFC 9110]
  files: ["**/*.go"]
  symbols: []
related: [go-net-idempotent-retry, go-net-mux-patterns]
sources:
  - title: RFC 9110 - Safe Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
  - title: RFC 9110 - Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
---
> Safe means read-only: crawlers and pre-fetchers may call it freely.

## Why

RFC 9110 defines safe methods as those whose semantics are essentially read-only, with the client neither requesting nor expecting any state change on the origin server. It adds that distinguishing safe from unsafe methods lets automated retrieval processes and cache pre-fetching work without fear of causing harm. Deleting or mutating state inside a GET handler breaks that contract for every crawler and proxy on the path.

## Bad

```go
import "net/http"

func handler(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodGet {
        deleteAll(r)
    }
}

func deleteAll(r *http.Request) {}
```

## Good

```go
import "net/http"

func handler(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodDelete {
        deleteAll(r)
    }
}

func deleteAll(r *http.Request) {}
```

## See Also

- [go-net-idempotent-retry](net-idempotent-retry.md) - the retry rule that builds on method safety
- [go-net-mux-patterns](net-mux-patterns.md) - binding the mutation to its method in the route
