---
id: go-data-json-encoder-stream
lang: go
prefix: data
title: Stream sequences of JSON values with json.Encoder
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [json, Encoder, stream, newline]
  files: ["**/*.go"]
  symbols: [json.NewEncoder, json.Encoder.Encode]
related: [go-data-json-raw-defer, go-perf-json-decoder-stream]
sources:
  - title: Package encoding/json - Encoder.Encode
    url: https://pkg.go.dev/encoding/json
  - title: Package encoding/json - Marshal
    url: https://pkg.go.dev/encoding/json
---
> Write each record with Encode instead of marshaling and appending newlines.

## Why

The encoding/json documentation states that Encoder.Encode writes the JSON encoding of v to the stream followed by a newline character, which is exactly the framing of newline-delimited JSON. Marshal returns bytes that the caller must frame and write, reimplementing both the newline rule and the partial-write handling. The encoder also writes directly to the destination instead of materializing each document first.

## Bad

```go
import (
    "encoding/json"
    "io"
)

func writeEvents(w io.Writer, events []Event) error {
    for _, e := range events {
        b, err := json.Marshal(e)
        if err != nil {
            return err
        }
        if _, err := w.Write(append(b, '\n')); err != nil {
            return err
        }
    }
    return nil
}

type Event struct{ ID string }
```

## Good

```go
import (
    "encoding/json"
    "io"
)

func writeEvents(w io.Writer, events []Event) error {
    enc := json.NewEncoder(w)
    for _, e := range events {
        if err := enc.Encode(e); err != nil {
            return err
        }
    }
    return nil
}

type Event struct{ ID string }
```

## See Also

- [go-data-json-raw-defer](data-json-raw-defer.md) - passing a payload through untouched
- [go-perf-json-decoder-stream](perf-json-decoder-stream.md) - the reading side of streaming
