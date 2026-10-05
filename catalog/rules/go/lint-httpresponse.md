---
id: go-lint-httpresponse
lang: go
prefix: lint
title: Check the HTTP error before touching the response
severity: must
enforce: tool
tool: go vet:httpresponse
baseline: latest
status: verified
triggers:
  keywords: [httpresponse, http.Get, nil response, vet]
  files: ["**/*.go"]
  symbols: [http.Get, resp.Body]
related: [go-lint-unmarshal-pointer, go-err-no-ignore]
sources:
  - title: cmd/vet - httpresponse
    url: https://pkg.go.dev/cmd/vet
  - title: Package net/http - Get
    url: https://pkg.go.dev/net/http
---
> Inspect err first; a failed request normally leaves no usable response.

## Why

The vet documentation lists httpresponse as the check for mistakes using HTTP responses, such as using the response before checking the error. The http package documents that on error any Response can be ignored, and that a non-nil Response with a non-nil error only occurs when CheckRedirect fails, with its Body already closed; a deferred Body.Close placed before the error check therefore still dereferences a nil response on an ordinary network failure. Reading the response only after err == nil avoids the dereference.

## Bad

```go
import "net/http"

func fetch(url string) (*http.Response, error) {
    resp, err := http.Get(url)
    defer resp.Body.Close()
    if err != nil {
        return nil, err
    }
    return resp, nil
}
```

## Good

```go
import "net/http"

func fetch(url string) (*http.Response, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return resp, nil
}
```

## See Also

- [go-lint-unmarshal-pointer](lint-unmarshal-pointer.md) - the other misuse-of-results check
- [go-err-no-ignore](err-no-ignore.md) - handling the error rather than deferring around it
