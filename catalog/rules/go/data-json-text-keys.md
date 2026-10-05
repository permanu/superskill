---
id: go-data-json-text-keys
lang: go
prefix: data
title: Implement TextMarshaler for structs used as JSON map keys
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, map key, TextMarshaler, MarshalText]
  files: ["**/*.go"]
  symbols: [encoding.TextMarshaler]
related: [go-data-json-binary-base64, go-data-json-tags-explicit]
sources:
  - title: Package encoding/json - Marshal
    url: https://pkg.go.dev/encoding/json
---
> Give key types MarshalText and UnmarshalText so maps of them can encode.

## Why

The encoding/json documentation states that a map's key type must be a string, an integer type, or implement encoding.TextMarshaler. A struct key compiles fine in Go but makes the encoder return an UnsupportedValueError as soon as the map has an entry, while an empty map marshals without error, so the failure surfaces only once data exists. Implementing the text interface makes the key type encodable everywhere, and the symmetric UnmarshalText keeps decoding possible.

## Bad

```go
type Tenant struct {
    Region string
}

var counts = map[Tenant]int{}
```

## Good

```go
type Tenant struct {
    Region string
}

func (t Tenant) MarshalText() ([]byte, error) { return []byte(t.Region), nil }

func (t *Tenant) UnmarshalText(b []byte) error {
    t.Region = string(b)
    return nil
}

var counts = map[Tenant]int{}
```

## See Also

- [go-data-json-binary-base64](data-json-binary-base64.md) - the same text-encoding boundary for values
- [go-data-json-tags-explicit](data-json-tags-explicit.md) - naming the rest of the wire format
