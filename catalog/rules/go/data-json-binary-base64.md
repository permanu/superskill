---
id: go-data-json-binary-base64
lang: go
prefix: data
title: Carry binary data as []byte so JSON encodes it as base64
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, "[]byte", base64, binary, UTF-8]
  files: ["**/*.go"]
  symbols: []
related: [go-data-json-text-keys, go-data-json-raw-defer]
sources:
  - title: Package encoding/json - Marshal
    url: https://pkg.go.dev/encoding/json
---
> Keep binary in []byte; converting it to string first corrupts it.

## Why

The encoding/json documentation says a []byte value encodes as a base64-encoded string, and that string values are coerced to valid UTF-8 by replacing invalid bytes with the Unicode replacement rune. Converting arbitrary bytes to a string before marshaling therefore destroys every byte sequence that is not valid UTF-8, and the corruption is invisible on the wire. A []byte field round-trips through base64 exactly.

## Bad

```go
type Blob struct {
    Data string `json:"data"`
}

func encode(b []byte) Blob {
    return Blob{Data: string(b)}
}
```

## Good

```go
type Blob struct {
    Data []byte `json:"data"`
}

func encode(b []byte) Blob {
    return Blob{Data: b}
}
```

## See Also

- [go-data-json-text-keys](data-json-text-keys.md) - the same encoding boundary for map keys
- [go-data-json-raw-defer](data-json-raw-defer.md) - deferring a payload that has its own encoding
