---
id: go-io-nop-closer
lang: go
prefix: io
title: Wrap a closeless reader with io.NopCloser
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.NopCloser, ReadCloser, wrapper]
  files: ["**/*.go"]
  symbols: [io.NopCloser]
related: [go-iface-accept-narrow, go-io-discard]
sources:
  - title: Package io - NopCloser
    url: https://pkg.go.dev/io
  - title: Package io - ReadCloser
    url: https://pkg.go.dev/io
---
> NopCloser adds the no-op Close an API expects, without a custom type.

## Why

The io documentation says NopCloser returns a ReadCloser with a no-op Close method wrapping the provided Reader. ReadCloser itself is just the grouping of the basic Read and Close methods. A hand-written wrapper type duplicates the same idea and must forward WriteTo and other optional interfaces if callers rely on them, which NopCloser already handles.

## Bad

```go
import "io"

type closer struct{ io.Reader }

func (closer) Close() error { return nil }
```

## Good

```go
import (
    "io"
    "strings"
)

func body(s string) io.ReadCloser {
    return io.NopCloser(strings.NewReader(s))
}
```

## See Also

- [go-iface-accept-narrow](iface-accept-narrow.md) - the interface choice this wrapper serves
- [go-io-discard](io-discard.md) - the write-side counterpart for sinks
