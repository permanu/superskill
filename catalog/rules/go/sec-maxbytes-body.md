---
id: go-sec-maxbytes-body
lang: go
prefix: sec
title: Bound request bodies with http.MaxBytesReader
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [MaxBytesReader, request body, size limit, DoS]
  files: ["**/*.go"]
  symbols: [http.MaxBytesReader]
related: [go-sec-json-v2, go-sec-valid-path]
sources:
  - title: Package net/http - MaxBytesReader
    url: https://pkg.go.dev/net/http
  - title: Package io - LimitReader
    url: https://pkg.go.dev/io
---
> Cap the number of bytes a handler will read from the client.

## Why

The net/http documentation defines MaxBytesReader as the request-body counterpart of io.LimitReader: it returns a ReadCloser that yields a *MaxBytesError past the limit and closes the underlying reader. io.ReadAll on an unbounded body lets one client allocate as much memory as it can send, which is a denial-of-service vector independent of any parsing bug. The error type also lets the handler answer with a proper status instead of a panic.

## Bad

```go
import (
    "io"
    "net/http"
)

func upload(w http.ResponseWriter, r *http.Request) ([]byte, error) {
    return io.ReadAll(r.Body)
}
```

## Good

```go
import (
    "io"
    "net/http"
)

func upload(w http.ResponseWriter, r *http.Request) ([]byte, error) {
    r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
    return io.ReadAll(r.Body)
}
```

## See Also

- [go-sec-json-v2](sec-json-v2.md) - the parser that consumes bounded input
- [go-sec-valid-path](sec-valid-path.md) - the same distrust applied to paths
