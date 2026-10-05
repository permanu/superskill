---
id: go-err-context-first-param
lang: go
prefix: err
title: Accept context.Context as the first parameter and thread it through blocking calls
severity: should
enforce: tool
tool: revive:context-as-argument
baseline: latest
status: verified
triggers:
  keywords: [context, cancellation, deadline, parameter, http]
  files: ["**/*.go"]
  symbols: [context.Context, http.NewRequestWithContext]
related: [go-err-context-preserve, go-err-retry-transient, go-err-goroutine-collect]
sources:
  - title: Package context
    url: https://pkg.go.dev/context
  - title: Go Code Review Comments - Contexts
    url: https://go.dev/wiki/CodeReviewComments
---
> Pass context.Context as the first parameter of anything that blocks, and never store it in a struct.

## Why

Context carries the caller's deadline and cancellation signal across API boundaries; a function that hides it behind a default client or a `context.Background()` call silently drops the caller's ability to stop the work. The convention is a first parameter named `ctx`, propagated to every I/O call, while context values stay limited to request-scoped data. Cancel functions must run on every path, which `go vet`'s lostcancel check enforces.

## Bad

```go
type Client struct{ baseURL string }

func (c *Client) Fetch(path string) ([]byte, error) {
    resp, err := http.Get(c.baseURL + path)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

## Good

```go
type Client struct{ baseURL string }

func (c *Client) Fetch(ctx context.Context, path string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
    if err != nil {
        return nil, fmt.Errorf("build request: %w", err)
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

## See Also

- [go-err-context-preserve](err-context-preserve.md) - returning the cancellation this parameter carries
- [go-err-retry-transient](err-retry-transient.md) - retry loops must select on ctx.Done()
- [go-err-goroutine-collect](err-goroutine-collect.md) - passing one context to a group of goroutines
