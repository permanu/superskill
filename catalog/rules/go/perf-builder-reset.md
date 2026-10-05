---
id: go-perf-builder-reset
lang: go
prefix: perf
title: Reuse a bytes.Buffer across iterations with Reset
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bytes.Buffer, Reset, reuse, loop]
  files: ["**/*.go"]
  symbols: [bytes.Buffer.Reset]
related: [go-perf-builder-grow, go-mem-sync-pool]
sources:
  - title: Package bytes - Buffer.Reset
    url: https://pkg.go.dev/bytes
  - title: "Go Slices: usage and internals"
    url: https://go.dev/blog/go-slices-usage-and-internals
---
> Hoist the buffer out of the loop and Reset it so the backing array is retained.

## Why

A buffer declared inside the loop throws away its storage every pass, so each iteration reallocates from zero. The bytes documentation says Reset resets the buffer to be empty but retains the underlying storage for use by future writes, so a hoisted buffer reuses its backing array across batches. A testing.AllocsPerRun probe over eight batches measures one allocation per batch for the fresh-buffer form against one per pass for the reused one; the slices article's growth mechanics explain why retained capacity is the saving.

## Bad

```go
import (
    "bytes"
    "io"
)

func writeAll(w io.Writer, batches [][]string) error {
    for _, batch := range batches {
        var b bytes.Buffer
        for _, part := range batch {
            b.WriteString(part)
        }
        if _, err := w.Write(b.Bytes()); err != nil {
            return err
        }
    }
    return nil
}
```

## Good

```go
import (
    "bytes"
    "io"
)

func writeAll(w io.Writer, batches [][]string) error {
    var b bytes.Buffer
    for _, batch := range batches {
        b.Reset()
        for _, part := range batch {
            b.WriteString(part)
        }
        if _, err := w.Write(b.Bytes()); err != nil {
            return err
        }
    }
    return nil
}
```

## See Also

- [go-perf-builder-grow](perf-builder-grow.md) - sizing the builder before the first write
- [go-mem-sync-pool](mem-sync-pool.md) - reusing buffers that outlive one function
