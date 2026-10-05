---
id: go-data-json-null-vs-absent
lang: go
prefix: data
title: Use a pointer to distinguish a present empty value from null or absent
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, "null", pointer, absent, optional]
  files: ["**/*.go"]
  symbols: []
related: [go-data-json-use-number, go-data-json-omitempty-vs-omitzero]
sources:
  - title: Package encoding/json - Unmarshal
    url: https://pkg.go.dev/encoding/json
---
> A *string separates a present empty string from null or absent.

## Why

The encoding/json documentation says the JSON null value unmarshals into an interface, map, pointer, or slice by setting it to nil, while unmarshaling null into any other Go type has no effect and produces no error. With a plain string field, a null, an absent key, and an empty string all leave the field at its zero value, so the handler cannot tell a present empty value from a missing one. A pointer field separates present values (non-nil, possibly empty) from null or absent (nil), which is what most handlers need to know.

## Bad

```go
type Settings struct {
    Theme string `json:"theme"`
}
```

## Good

```go
type Settings struct {
    Theme *string `json:"theme"`
}
```

## See Also

- [go-data-json-use-number](data-json-use-number.md) - the numeric version of the same any-decoding trap
- [go-data-json-omitempty-vs-omitzero](data-json-omitempty-vs-omitzero.md) - the output side of zero versus absent
