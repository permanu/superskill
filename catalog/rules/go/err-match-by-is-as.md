---
id: go-err-match-by-is-as
lang: go
prefix: err
title: Match errors with errors.Is and errors.As instead of equality, assertions, or strings
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, errors.Is, errors.As, sentinel, wrapping]
  files: ["**/*.go"]
  symbols: [errors.Is, errors.As, errors.AsType]
related: [go-err-wrap-with-w, go-err-contract-minimal]
sources:
  - title: Package errors
    url: https://pkg.go.dev/errors
  - title: Working with Errors in Go 1.13
    url: https://go.dev/blog/go1.13-errors
---
> Match errors with errors.Is and errors.As, never with ==, string comparison, or a bare type assertion.

## Why

A returned error can wrap the condition the caller cares about, so `==` sees only the outermost value and an assertion misses wrapped types. `errors.Is` walks the whole tree for a value match, and `errors.As` (or the type-safe `errors.AsType`, which the standard library now recommends for most uses) extracts the first error of a target type so callers can inspect its fields. Matching on `err.Error()` text ties behavior to wording that changes freely.

## Bad

```go
func classify(err error) string {
    if err == os.ErrNotExist {
        return "missing"
    }
    if perr, ok := err.(*fs.PathError); ok {
        return "io on " + perr.Path
    }
    return fmt.Sprintf("other: %v", err)
}
```

## Good

```go
func classify(err error) string {
    if errors.Is(err, os.ErrNotExist) {
        return "missing"
    }
    if perr, ok := errors.AsType[*fs.PathError](err); ok {
        return "io on " + perr.Path
    }
    return fmt.Sprintf("other: %v", err)
}
```

## See Also

- [go-err-wrap-with-w](err-wrap-with-w.md) - `%w` builds the chain this rule traverses
- [go-err-contract-minimal](err-contract-minimal.md) - decides which conditions callers may match on
