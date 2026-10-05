---
id: go-io-seek-whence
lang: go
prefix: io
title: Pass io.SeekStart, io.SeekCurrent, or io.SeekEnd as whence
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Seek, whence, SeekStart, offsets]
  files: ["**/*.go"]
  symbols: [io.SeekStart, io.SeekCurrent, io.SeekEnd]
related: [go-iface-accept-narrow, go-io-read-full]
sources:
  - title: Package io - Seeker
    url: https://pkg.go.dev/io
  - title: Package os - Seek whence values
    url: https://pkg.go.dev/os
---
> Named whence constants document the reference point at the call site.

## Why

The io documentation defines SeekStart as relative to the start of the file, SeekCurrent as relative to the current offset, and SeekEnd as relative to the end. The os package keeps the same names for its Seek constants and marks the raw integer forms deprecated. A bare 0, 1, or 2 forces every reader to remember the convention; the constants make the reference point part of the code.

## Bad

```go
import "io"

func rewind(r io.Seeker) (int64, error) {
    return r.Seek(0, 0)
}
```

## Good

```go
import "io"

func rewind(r io.Seeker) (int64, error) {
    return r.Seek(0, io.SeekStart)
}
```

## See Also

- [go-iface-accept-narrow](iface-accept-narrow.md) - the interface family Seek belongs to
- [go-io-read-full](io-read-full.md) - reading at a known position instead of seeking
