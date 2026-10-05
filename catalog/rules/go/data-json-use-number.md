---
id: go-data-json-use-number
lang: go
prefix: data
title: Decode unknown numbers with UseNumber to keep precision
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, float64, UseNumber, precision, ID]
  files: ["**/*.go"]
  symbols: [json.Decoder.UseNumber]
related: [go-data-json-null-vs-absent, go-data-json-raw-defer]
sources:
  - title: Package encoding/json - Decoder.UseNumber
    url: https://pkg.go.dev/encoding/json
  - title: Package encoding/json - Unmarshal
    url: https://pkg.go.dev/encoding/json
---
> When decoding into any, ask for json.Number instead of float64.

## Why

The encoding/json documentation states that decoding into an interface value stores float64 for JSON numbers, and that UseNumber causes the decoder to store a json.Number instead. A 64-bit identifier or a large monetary amount silently loses precision the moment it becomes a float64, and re-encoding can produce different digits. Numbers stay as their original literal with UseNumber, to be converted only where the target type is known.

## Bad

```go
import (
    "encoding/json"
    "io"
)

func decodeNumbers(r io.Reader) (map[string]any, error) {
    var v map[string]any
    err := json.NewDecoder(r).Decode(&v)
    return v, err
}
```

## Good

```go
import (
    "encoding/json"
    "io"
)

func decodeNumbers(r io.Reader) (map[string]any, error) {
    var v map[string]any
    dec := json.NewDecoder(r)
    dec.UseNumber()
    err := dec.Decode(&v)
    return v, err
}
```

## See Also

- [go-data-json-null-vs-absent](data-json-null-vs-absent.md) - the other any-decoding trap
- [go-data-json-raw-defer](data-json-raw-defer.md) - deferring the whole payload instead
