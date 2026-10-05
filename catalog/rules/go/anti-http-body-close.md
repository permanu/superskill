---
id: go-anti-http-body-close
lang: go
prefix: anti
title: Always close the response body after a successful request
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [http.Response, Body, Close, leak, keep-alive]
  files: ["**/*.go"]
  symbols: [http.Response.Body]
related: [go-anti-http-default-client, go-err-no-ignore]
sources:
  - title: Package net/http - Response.Body
    url: https://pkg.go.dev/net/http
  - title: Package net/http - Clients and Transports
    url: https://pkg.go.dev/net/http
---
> Close every response body; the caller owns it and pooling depends on it.

## Why

The net/http documentation states that it is the caller's responsibility to close Body, and that the default client's Transport may not reuse HTTP/1.x keep-alive connections if the Body is not read to completion and closed. A function that returns after reading only the status code leaks the connection and the goroutine machinery behind it, which accumulates under load. Closing in a defer is enough in most cases, because closing also causes the body to be read to completion asynchronously up to a conservative limit.

## Bad

```go
import "net/http"

func status(client *http.Client, url string) (string, error) {
    resp, err := client.Get(url)
    if err != nil {
        return "", err
    }
    return resp.Status, nil
}
```

## Good

```go
import "net/http"

func status(client *http.Client, url string) (string, error) {
    resp, err := client.Get(url)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    return resp.Status, nil
}
```

## See Also

- [go-anti-http-default-client](anti-http-default-client.md) - creating the client that makes the request
- [go-err-no-ignore](err-no-ignore.md) - handling the error a Close call can return
