---
id: go-sec-json-v2
lang: go
prefix: sec
title: Use encoding/json/v2 for new JSON code
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encoding/json/v2, JSON, defaults, security]
  files: ["**/*.go"]
  symbols: [jsonv2.Unmarshal, json.Unmarshal]
related: [go-sec-maxbytes-body, go-perf-json-decoder-stream]
sources:
  - title: Package encoding/json - Security Considerations
    url: https://pkg.go.dev/encoding/json
  - title: Go Release Notes - encoding/json/v2
    url: https://go.dev/doc/go1.27
---
> Reach for encoding/json/v2 in new code; v1 keeps historical, less secure defaults.

## Why

The encoding/json documentation states that v1 operates with less secure defaults for historical reasons and encourages new usages of JSON to use encoding/json/v2 instead. The v2 package rejects invalid UTF-8 and duplicate object names by default, while v1 silently replaces invalid bytes and accepts duplicates. v1 remains supported, so migrating is a choice per call site rather than a flag day.

## Bad

```go
import "encoding/json"

func parse(data []byte) (map[string]any, error) {
    var v map[string]any
    if err := json.Unmarshal(data, &v); err != nil {
        return nil, err
    }
    return v, nil
}
```

## Good

```go
import jsonv2 "encoding/json/v2"

func parse(data []byte) (map[string]any, error) {
    var v map[string]any
    if err := jsonv2.Unmarshal(data, &v); err != nil {
        return nil, err
    }
    return v, nil
}
```

## See Also

- [go-sec-maxbytes-body](sec-maxbytes-body.md) - bounding the JSON that reaches the parser
- [go-perf-json-decoder-stream](perf-json-decoder-stream.md) - streaming instead of buffering
