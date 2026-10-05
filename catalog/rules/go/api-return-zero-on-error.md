---
id: go-api-return-zero-on-error
lang: go
prefix: api
title: Return zero values with an error unless partial results are part of the contract
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, zero value, return values, partial result]
  files: ["**/*.go"]
  symbols: [error]
related: [go-api-error-last, go-api-doc-errors, go-err-partial-result]
sources:
  - title: Google Go Style Decisions - Returning errors
    url: https://google.github.io/styleguide/go/decisions
  - title: Effective Go - Multiple return values
    url: https://go.dev/doc/effective_go
---
> Return zero values with an error unless the API documents partial results.

## Why

Callers of a function that returned an error must treat the other results as unspecified; the style decisions state that the values are commonly their zero values but that this cannot be assumed. Returning a half-filled structure invites callers to use it anyway, which turns one failure into two. APIs with real partial results, such as io.Writer's byte count, document that contract explicitly.

## Bad

```go
func Split(s, sep string) ([]string, error) {
    if s == "" {
        return []string{""}, errors.New("empty input")
    }
    return strings.Split(s, sep), nil
}
```

## Good

```go
func Split(s, sep string) ([]string, error) {
    if s == "" {
        return nil, errors.New("empty input")
    }
    return strings.Split(s, sep), nil
}
```

## See Also

- [go-api-error-last](api-error-last.md) - the error's position in the signature
- [go-api-doc-errors](api-doc-errors.md) - documenting the failure contract
- [go-err-partial-result](err-partial-result.md) - the documented exception
