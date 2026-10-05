---
id: go-data-csv-reuse-record
lang: go
prefix: data
title: Turn on ReuseRecord when CSV rows are copied immediately
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [csv, ReuseRecord, allocation, streaming]
  files: ["**/*.go"]
  symbols: [csv.Reader.ReuseRecord]
related: [go-data-csv-flush-error, go-perf-fields-seq]
sources:
  - title: Package encoding/csv - Reader.ReuseRecord
    url: https://pkg.go.dev/encoding/csv
  - title: Package encoding/csv - Reader.Read
    url: https://pkg.go.dev/encoding/csv
---
> Set ReuseRecord for streaming loops; never keep the slice it returns.

## Why

The encoding/csv documentation defines ReuseRecord as controlling whether Read may return a slice sharing the backing array of the previous call, against the default of newly allocated memory owned by the caller. A loop that immediately copies each field into its own storage does not need that allocation per row. The trade is explicit in the Read docs: with reuse on, the returned slice is only valid until the next call.

## Bad

```go
import (
    "encoding/csv"
    "io"
)

func readAll(r io.Reader) ([]string, error) {
    cr := csv.NewReader(r)
    var out []string
    for {
        rec, err := cr.Read()
        if err == io.EOF {
            return out, nil
        }
        if err != nil {
            return nil, err
        }
        out = append(out, rec...)
    }
}
```

## Good

```go
import (
    "encoding/csv"
    "io"
)

func readAll(r io.Reader) ([]string, error) {
    cr := csv.NewReader(r)
    cr.ReuseRecord = true
    var out []string
    for {
        rec, err := cr.Read()
        if err == io.EOF {
            return out, nil
        }
        if err != nil {
            return nil, err
        }
        out = append(out, rec...)
    }
}
```

## See Also

- [go-data-csv-flush-error](data-csv-flush-error.md) - the write-side contract of the package
- [go-perf-fields-seq](perf-fields-seq.md) - the same avoid-the-slice idea for strings
