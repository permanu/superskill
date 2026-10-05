---
id: go-data-csv-flush-error
lang: go
prefix: data
title: Check csv.Writer.Error after Flush
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [csv, Flush, Error, buffered writer]
  files: ["**/*.go"]
  symbols: [csv.Writer.Flush, csv.Writer.Error]
related: [go-data-csv-reuse-record, go-err-no-ignore]
sources:
  - title: Package encoding/csv - Writer
    url: https://pkg.go.dev/encoding/csv
  - title: Package encoding/csv - Writer.Flush
    url: https://pkg.go.dev/encoding/csv
---
> A successful Write means buffered, not written; Flush then Error reveals failures.

## Why

The encoding/csv documentation says writes are buffered, that the client should call Flush after all data is written, and that any errors should be checked by calling Writer.Error. It also notes that to check whether an error occurred during Flush, call Error, because Flush itself returns nothing. A disk-full or closed-pipe failure therefore surfaces only through that call, and skipping it reports success for data that never landed.

## Bad

```go
import (
    "encoding/csv"
    "io"
)

func writeCSV(w io.Writer, rows [][]string) error {
    cw := csv.NewWriter(w)
    for _, row := range rows {
        if err := cw.Write(row); err != nil {
            return err
        }
    }
    cw.Flush()
    return nil
}
```

## Good

```go
import (
    "encoding/csv"
    "io"
)

func writeCSV(w io.Writer, rows [][]string) error {
    cw := csv.NewWriter(w)
    for _, row := range rows {
        if err := cw.Write(row); err != nil {
            return err
        }
    }
    cw.Flush()
    return cw.Error()
}
```

## See Also

- [go-data-csv-reuse-record](data-csv-reuse-record.md) - the read side of the same package
- [go-err-no-ignore](err-no-ignore.md) - the general rule this applies to a buffered writer
