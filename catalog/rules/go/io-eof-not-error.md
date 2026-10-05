---
id: go-io-eof-not-error
lang: go
prefix: io
title: Treat io.EOF as the end of input, not a failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.EOF, end of input, errors.Is]
  files: ["**/*.go"]
  symbols: [io.EOF]
related: [go-io-read-all, go-err-match-by-is-as]
sources:
  - title: Package io - EOF
    url: https://pkg.go.dev/io
  - title: Package io - Reader
    url: https://pkg.go.dev/io
---
> EOF signals a graceful end; report it as an error only if it is unexpected.

## Why

The io documentation defines EOF as the error returned by Read when no more input is available, and notes that Read must return EOF itself because callers test for it. It adds that functions should return EOF only to signal a graceful end of input, and that an unexpected EOF in a structured stream should be ErrUnexpectedEOF or a more detailed error. Returning every EOF as a failure turns normal completion into an incident.

## Bad

```go
import "io"

func drain(r io.Reader, buf []byte) error {
    for {
        _, err := r.Read(buf)
        if err != nil {
            return err
        }
    }
}
```

## Good

```go
import (
    "errors"
    "io"
)

func drain(r io.Reader, buf []byte) error {
    for {
        _, err := r.Read(buf)
        if errors.Is(err, io.EOF) {
            return nil
        }
        if err != nil {
            return err
        }
    }
}
```

## See Also

- [go-io-read-all](io-read-all.md) - the helper that already applies this rule
- [go-err-match-by-is-as](err-match-by-is-as.md) - matching sentinel errors without equality
