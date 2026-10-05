---
id: go-err-partial-result
lang: go
prefix: err
title: Return the partial result alongside the error when work stopped midway
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, partial failure, count, io.Writer, retry]
  files: ["**/*.go"]
  symbols: [io.Writer]
related: [go-err-join, go-err-no-ignore]
sources:
  - title: Effective Go - Multiple return values
    url: https://go.dev/doc/effective_go
  - title: Google Go Style Best Practices - Error handling
    url: https://google.github.io/styleguide/go/best-practices
---
> Report both the completed portion and the error when an operation stops partway.

## Why

Callers of a partial failure must know how much was applied to retry safely. `io.Writer`'s `(n int, err error)` contract is the canonical example: a short write returns the count and the error together. A bare error forces the caller to guess between total failure and total success, and guessing wrong duplicates or loses data.

## Bad

```go
func writeChunks(w io.Writer, chunks []string) error {
    for _, chunk := range chunks {
        if _, err := io.WriteString(w, chunk); err != nil {
            return fmt.Errorf("write %q: %w", chunk, err)
        }
    }
    return nil
}
```

## Good

```go
func writeChunks(w io.Writer, chunks []string) (int, error) {
    written := 0
    for _, chunk := range chunks {
        n, err := io.WriteString(w, chunk)
        written += n
        if err != nil {
            return written, fmt.Errorf("wrote %d bytes, then %q failed: %w", written, chunk, err)
        }
    }
    return written, nil
}
```

## See Also

- [go-err-join](err-join.md) - aggregating the errors of steps that all ran
- [go-err-no-ignore](err-no-ignore.md) - never trade the error away to keep the result
