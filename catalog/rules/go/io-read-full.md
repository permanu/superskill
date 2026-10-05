---
id: go-io-read-full
lang: go
prefix: io
title: Read an exact length with io.ReadFull
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.ReadFull, short read, header, binary]
  files: ["**/*.go"]
  symbols: [io.ReadFull]
related: [go-io-read-all, go-io-eof-not-error]
sources:
  - title: Package io - ReadFull
    url: https://pkg.go.dev/io
  - title: Package io - Reader
    url: https://pkg.go.dev/io
---
> One Read may return fewer bytes; ReadFull loops until the buffer is full.

## Why

The Reader documentation says Read reads up to len(p) bytes and conventionally returns what is available instead of waiting for more. The io documentation says ReadFull reads exactly len(buf) bytes and returns ErrUnexpectedEOF if EOF happens after some but not all of the bytes. Parsing a fixed-size header with a single Read therefore works on fast local pipes and fails on segmented network streams.

## Bad

```go
import "io"

func readHeader(r io.Reader) ([]byte, error) {
    buf := make([]byte, 8)
    _, err := r.Read(buf)
    return buf, err
}
```

## Good

```go
import "io"

func readHeader(r io.Reader) ([]byte, error) {
    buf := make([]byte, 8)
    _, err := io.ReadFull(r, buf)
    return buf, err
}
```

## See Also

- [go-io-read-all](io-read-all.md) - when the length is unknown instead
- [go-io-eof-not-error](io-eof-not-error.md) - handling the EOF ReadFull reports
