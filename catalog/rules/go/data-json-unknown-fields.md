---
id: go-data-json-unknown-fields
lang: go
prefix: data
title: Reject unknown JSON fields at strict boundaries
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, DisallowUnknownFields, schema, config]
  files: ["**/*.go"]
  symbols: [json.Decoder.DisallowUnknownFields]
related: [go-data-json-tags-explicit, go-data-json-omitempty-vs-omitzero]
sources:
  - title: Package encoding/json - Decoder.DisallowUnknownFields
    url: https://pkg.go.dev/encoding/json
  - title: Package encoding/json - Unmarshal
    url: https://pkg.go.dev/encoding/json
---
> Turn on DisallowUnknownFields where a typo must fail instead of vanish.

## Why

The encoding/json documentation says DisallowUnknownFields causes the decoder to return an error when the destination is a struct and the input contains object keys that do not match any non-ignored exported field. Unmarshal's default, documented in the same package, ignores unknown keys, so a misspelled config option is dropped without a trace. Strict decoding is the difference between a typo and a silent default.

## Bad

```go
import (
    "encoding/json"
    "io"
)

func decodeConfig(r io.Reader) (Config, error) {
    var cfg Config
    err := json.NewDecoder(r).Decode(&cfg)
    return cfg, err
}

type Config struct {
    Name string `json:"name"`
}
```

## Good

```go
import (
    "encoding/json"
    "io"
)

func decodeConfig(r io.Reader) (Config, error) {
    var cfg Config
    dec := json.NewDecoder(r)
    dec.DisallowUnknownFields()
    err := dec.Decode(&cfg)
    return cfg, err
}

type Config struct {
    Name string `json:"name"`
}
```

## See Also

- [go-data-json-tags-explicit](data-json-tags-explicit.md) - the tags that define known fields
- [go-data-json-omitempty-vs-omitzero](data-json-omitempty-vs-omitzero.md) - the output-side counterpart
