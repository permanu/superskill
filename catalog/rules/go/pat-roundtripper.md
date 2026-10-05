---
id: go-pat-roundtripper
lang: go
prefix: pat
title: Wrap cross-cutting HTTP behavior in a RoundTripper
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [RoundTripper, transport, middleware, auth]
  files: ["**/*.go"]
  symbols: [http.RoundTripper]
related: [go-pat-explicit-deps, go-anti-http-default-client]
sources:
  - title: Package net/http - RoundTripper
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Transport
    url: https://pkg.go.dev/net/http
---
> One transport wrapper covers every request without touching call sites.

## Why

The net/http documentation defines RoundTripper as the interface representing the ability to execute a single HTTP transaction, and requires implementations to be safe for concurrent use. Wrapping a transport lets cross-cutting behavior such as authentication apply to every request without editing each call site. The wrapper composes with the client's connection pooling because the base transport is still the one dialing.

## Bad

```go
import "net/http"

func get(client *http.Client, url string) (*http.Response, error) {
    req, err := http.NewRequest("GET", url, nil)
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer token")
    return client.Do(req)
}
```

## Good

```go
import "net/http"

type authTransport struct {
    base  http.RoundTripper
    token string
}

func (t *authTransport) RoundTrip(r *http.Request) (*http.Response, error) {
    r.Header.Set("Authorization", "Bearer "+t.token)
    return t.base.RoundTrip(r)
}
```

## See Also

- [go-anti-http-default-client](anti-http-default-client.md) - the client that owns the transport
- [go-pat-explicit-deps](pat-explicit-deps.md) - passing the token instead of reading global state
