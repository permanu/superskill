---
id: go-api-nil-vs-empty-slice
lang: go
prefix: api
title: Do not make nil and empty slices mean different things
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nil slice, empty slice, API contract, return values]
  files: ["**/*.go"]
  symbols: [nil]
related: [go-api-return-zero-on-error, go-api-error-last]
sources:
  - title: Google Go Style Decisions - Nil slices
    url: https://google.github.io/styleguide/go/decisions
  - title: Go Code Review Comments - Declaring Empty Slices
    url: https://go.dev/wiki/CodeReviewComments
---
> Treat nil and zero-length slices as the same empty value in your API.

## Why

nil and empty slices behave identically for len, cap, range, and append, so an API that distinguishes them makes callers depend on an accident of implementation. The style decisions say not to create APIs that force clients to distinguish nil from the empty slice; the review guide adds that interfaces should avoid the distinction too. When "no results" and "failed" differ, say so with an error, not with nil.

## Bad

```go
// Active returns nil when the service is down and an empty slice when idle.
func Active() []string { return nil }
```

## Good

```go
// Active returns the active sessions and an error if the state is unavailable.
func Active() ([]string, error) { return nil, nil }
```

## See Also

- [go-api-return-zero-on-error](api-return-zero-on-error.md) - using the error channel for failure
- [go-api-error-last](api-error-last.md) - the error's place in the signature
