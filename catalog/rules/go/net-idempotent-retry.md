---
id: go-net-idempotent-retry
lang: go
prefix: net
title: Retry only idempotent HTTP methods
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retry, idempotent, POST, RFC 9110]
  files: ["**/*.go"]
  symbols: []
related: [go-err-retry-transient, go-net-safe-get]
sources:
  - title: RFC 9110 - Idempotent Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
  - title: RFC 9110 - Safe Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html
---
> A blind POST retry can duplicate the order it was meant to send once.

## Why

RFC 9110 says a client should not automatically retry a request with a non-idempotent method unless it has some means to know that the request semantics are actually idempotent or that the original request was never applied, and that a proxy must not automatically retry non-idempotent requests at all. Retrying a POST blindly can duplicate an order or a payment. The method is the first filter a retry policy should apply, before classifying the error.

## Bad

```go
func shouldRetry(method string) bool {
    return true
}
```

## Good

```go
func shouldRetry(method string) bool {
    switch method {
    case "GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE":
        return true
    }
    return false
}
```

## See Also

- [go-err-retry-transient](err-retry-transient.md) - the error classification that follows the method check
- [go-net-safe-get](net-safe-get.md) - why GET and HEAD are always retryable
