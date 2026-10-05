---
id: go-io-read-all
lang: go
prefix: io
title: Read a whole stream with io.ReadAll
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [io.ReadAll, loop, buffer, stream]
  files: ["**/*.go"]
  symbols: [io.ReadAll]
related: [go-io-limit-reader, go-io-read-full]
sources:
  - title: Package io - ReadAll
    url: https://pkg.go.dev/io
  - title: Package io - Reader
    url: https://pkg.go.dev/io
---
> ReadAll handles the EOF and partial-read rules the loop reimplements.

## Why

The io documentation says ReadAll reads from r until an error or EOF and returns the data it read, and that a successful call returns err == nil, not err == EOF. The Reader contract adds that a Read may return data together with an error, and that callers should process the bytes before considering the error. A hand-written accumulation loop must get both rules right; ReadAll already does.

## Bad

```go
import "io"

func slurp(r io.Reader) ([]byte, error) {
    var data []byte
    buf := make([]byte, 512)
    for {
        n, err := r.Read(buf)
        data = append(data, buf[:n]...)
        if err == io.EOF {
            return data, nil
        }
        if err != nil {
            return nil, err
        }
    }
}
```

## Good

```go
import "io"

func slurp(r io.Reader) ([]byte, error) {
    return io.ReadAll(r)
}
```

## See Also

- [go-io-limit-reader](io-limit-reader.md) - bounding the read when the input is untrusted
- [go-io-read-full](io-read-full.md) - reading an exact number of bytes instead
