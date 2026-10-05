---
id: go-io-limit-reader
lang: go
prefix: io
title: Bound untrusted reads with io.LimitReader
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.LimitReader, bound, untrusted input]
  files: ["**/*.go"]
  symbols: [io.LimitReader]
related: [go-io-read-all, go-sec-maxbytes-body]
sources:
  - title: Package io - LimitReader
    url: https://pkg.go.dev/io
  - title: Package io - ReadAll
    url: https://pkg.go.dev/io
---
> A limit turns an unbounded ReadAll into a bounded one.

## Why

The io documentation says LimitReader returns a Reader that reads from r but stops with EOF after n bytes. ReadAll keeps reading until EOF, so wrapping it in LimitReader caps the memory a hostile or broken input can consume. The same wrapper works for any consumer that takes a Reader, not only for HTTP bodies.

## Bad

```go
import "io"

func readConfig(r io.Reader) ([]byte, error) {
    return io.ReadAll(r)
}
```

## Good

```go
import "io"

const maxConfig = 1 << 20

func readConfig(r io.Reader) ([]byte, error) {
    return io.ReadAll(io.LimitReader(r, maxConfig))
}
```

## See Also

- [go-io-read-all](io-read-all.md) - the helper being bounded
- [go-sec-maxbytes-body](sec-maxbytes-body.md) - the HTTP-specific version of the same limit
