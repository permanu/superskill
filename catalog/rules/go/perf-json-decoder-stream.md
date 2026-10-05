---
id: go-perf-json-decoder-stream
lang: go
prefix: perf
title: Decode JSON streams with json.Decoder instead of ReadAll plus Unmarshal
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, Decoder, streaming, memory]
  files: ["**/*.go"]
  symbols: [json.NewDecoder, json.Unmarshal]
related: [go-perf-fields-seq, go-mem-slices-clone]
sources:
  - title: Package encoding/json - Decoder
    url: https://pkg.go.dev/encoding/json
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Decode straight from the reader; ReadAll buffers the entire payload first.

## Why

The json package describes a Decoder as reading and decoding values from an input stream, so the payload never has to be materialized as one []byte. ReadAll plus Unmarshal allocates the whole document and then copies through it, which doubles peak memory for large bodies and blocks until the stream ends. The same decoder also exposes Token and More for framing multiple values without extra parsing.

## Bad

```go
func decode(r io.Reader) ([]Item, error) {
    data, err := io.ReadAll(r)
    if err != nil {
        return nil, err
    }
    var items []Item
    if err := json.Unmarshal(data, &items); err != nil {
        return nil, err
    }
    return items, nil
}

type Item struct{ ID string }
```

## Good

```go
func decode(r io.Reader) ([]Item, error) {
    var items []Item
    if err := json.NewDecoder(r).Decode(&items); err != nil {
        return nil, err
    }
    return items, nil
}

type Item struct{ ID string }
```

## See Also

- [go-perf-fields-seq](perf-fields-seq.md) - the same avoid-the-buffer choice for strings
- [go-mem-slices-clone](mem-slices-clone.md) - ownership of decoded slices
