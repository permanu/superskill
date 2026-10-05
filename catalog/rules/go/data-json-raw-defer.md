---
id: go-data-json-raw-defer
lang: go
prefix: data
title: Defer nested payload decoding with json.RawMessage
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, RawMessage, defer, envelope]
  files: ["**/*.go"]
  symbols: [json.RawMessage]
related: [go-data-json-encoder-stream, go-data-json-use-number]
sources:
  - title: Package encoding/json - RawMessage
    url: https://pkg.go.dev/encoding/json
  - title: Package encoding/json - Unmarshal
    url: https://pkg.go.dev/encoding/json
---
> Keep an embedded payload as RawMessage and decode it once its type is known.

## Why

The encoding/json documentation describes RawMessage as a raw encoded JSON value that implements Marshaler and Unmarshaler and can delay JSON decoding or precompute an encoding. Decoding an envelope into any eagerly chooses a concrete shape, turning objects into map[string]any and numbers into float64 before the application knows what the payload is. RawMessage keeps the exact bytes so the inner decoder can use the right type, and re-marshaling does not reserialize them.

## Bad

```go
type Envelope struct {
    Type    string `json:"type"`
    Payload any    `json:"payload"`
}
```

## Good

```go
import "encoding/json"

type Envelope struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"`
}
```

## See Also

- [go-data-json-encoder-stream](data-json-encoder-stream.md) - streaming envelopes in sequence
- [go-data-json-use-number](data-json-use-number.md) - the precision cost of decoding into any
