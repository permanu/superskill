---
id: go-perf-io-copy
lang: go
prefix: perf
title: Copy streams with io.Copy instead of a hand-written read loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.Copy, stream, buffer, short read]
  files: ["**/*.go"]
  symbols: [io.Copy]
related: [go-perf-http-client-reuse, go-err-partial-result]
sources:
  - title: Package io - Copy
    url: https://pkg.go.dev/io
  - title: Package io - CopyBuffer
    url: https://pkg.go.dev/io
---
> Let io.Copy run the loop; it uses WriterTo and ReaderFrom when they exist.

## Why

io.Copy is documented to use src.WriteTo when the source implements it and dst.ReadFrom when the destination does, which lets files, sockets, and compression writers move data without an intermediate copy. A hand-written loop always stages through the caller's buffer and must get partial reads, partial writes, and EOF handling right. The standard implementation already encodes those rules.

## Bad

```go
func save(w io.Writer, r io.Reader) error {
    buf := make([]byte, 4096)
    for {
        n, err := r.Read(buf)
        if n > 0 {
            if _, werr := w.Write(buf[:n]); werr != nil {
                return werr
            }
        }
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }
    }
}
```

## Good

```go
func save(w io.Writer, r io.Reader) error {
    _, err := io.Copy(w, r)
    return err
}
```

## See Also

- [go-perf-http-client-reuse](perf-http-client-reuse.md) - the other place reuse beats recreation
- [go-err-partial-result](err-partial-result.md) - the short-write contract Copy already handles
