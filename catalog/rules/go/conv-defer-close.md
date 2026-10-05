---
id: go-conv-defer-close
lang: go
prefix: conv
title: Defer Close immediately after a successful open
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [defer, Close, os.Open, resources]
  files: ["**/*.go"]
  symbols: []
related: [go-conv-slices-over-arrays, go-err-no-ignore]
sources:
  - title: Effective Go - Defer
    url: https://go.dev/doc/effective_go
  - title: Package os - Open
    url: https://pkg.go.dev/os
---
> The deferred close sits near the open and survives every return path.

## Why

Effective Go says deferring a call to a function such as Close has two advantages: it guarantees that you will never forget to close the file when a later edit adds a return path, and it keeps the close near the open rather than at the end of the function. Closing manually at the bottom works until the first early return. The deferred form is evaluated at the open, so it also captures the right receiver.

## Bad

```go
import "os"

func read(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    buf := make([]byte, 1024)
    n, err := f.Read(buf)
    if err != nil {
        return nil, err
    }
    if err := f.Close(); err != nil {
        return nil, err
    }
    return buf[:n], nil
}
```

## Good

```go
import "os"

func read(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    buf := make([]byte, 1024)
    n, err := f.Read(buf)
    if err != nil {
        return nil, err
    }
    return buf[:n], nil
}
```

## See Also

- [go-conv-slices-over-arrays](conv-slices-over-arrays.md) - the other Effective Go convention worth adopting
- [go-err-no-ignore](err-no-ignore.md) - when a Close error must be reported instead
