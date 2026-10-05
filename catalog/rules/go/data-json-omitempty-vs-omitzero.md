---
id: go-data-json-omitempty-vs-omitzero
lang: go
prefix: data
title: Use omitzero for bool, number, pointer, and interface fields
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, omitempty, omitzero, zero value]
  files: ["**/*.go"]
  symbols: []
related: [go-data-json-tags-explicit, go-data-json-null-vs-absent]
sources:
  - title: Package encoding/json - Migrating to v2
    url: https://pkg.go.dev/encoding/json
---
> Prefer omitzero on scalar and pointer fields; omitempty's definition is broader.

## Why

The encoding/json migration notes state that existing usages of omitempty on a Go bool, number, pointer, or interface value should migrate to omitzero, which is identically supported in both v1 and v2. omitempty omits any "empty" Go value and, under v2 semantics, any value that encodes as an empty JSON value, so its behavior on scalars depends on which implementation runs. omitzero asks the narrower question the author usually means: is this the zero value.

## Bad

```go
type Flags struct {
    Enabled bool `json:"enabled,omitempty"`
}
```

## Good

```go
type Flags struct {
    Enabled bool `json:"enabled,omitzero"`
}
```

## See Also

- [go-data-json-tags-explicit](data-json-tags-explicit.md) - the tag these options belong to
- [go-data-json-null-vs-absent](data-json-null-vs-absent.md) - distinguishing absent from zero
