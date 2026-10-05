---
id: go-io-discard
lang: go
prefix: io
title: Discard output with io.Discard instead of a custom sink
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.Discard, sink, no-op writer]
  files: ["**/*.go"]
  symbols: [io.Discard]
related: [go-io-nop-closer, go-iface-accept-narrow]
sources:
  - title: Package io - Discard
    url: https://pkg.go.dev/io
  - title: Package io - Writer
    url: https://pkg.go.dev/io
---
> io.Discard is the shared Writer that succeeds without doing anything.

## Why

The io documentation describes Discard as a Writer on which all Write calls succeed without doing anything, and the Writer contract requires returning a non-nil error when fewer than len(p) bytes are written. A custom no-op writer has to satisfy that contract correctly and gives every package its own version of the same type. Using io.Discard states the intent in one word and works anywhere a Writer is accepted.

## Bad

```go
type sink struct{}

func (sink) Write(p []byte) (int, error) { return len(p), nil }
```

## Good

```go
import (
    "io"
    "log"
)

func quietLogger() *log.Logger {
    return log.New(io.Discard, "", 0)
}
```

## See Also

- [go-io-nop-closer](io-nop-closer.md) - the read-side equivalent
- [go-iface-accept-narrow](iface-accept-narrow.md) - taking a Writer rather than a concrete sink
