---
id: go-api-error-last
lang: go
prefix: api
title: Return the error as the last result parameter
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error, return values, signature, convention]
  files: ["**/*.go"]
  symbols: [error]
related: [go-api-return-zero-on-error, go-api-doc-errors]
sources:
  - title: Google Go Style Decisions - Returning errors
    url: https://google.github.io/styleguide/go/decisions
  - title: Effective Go - Multiple return values
    url: https://go.dev/doc/effective_go
---
> Put the error in the final result position, after every value it describes.

## Why

The error-last convention is what every reader, linter, and code generator expects, and it keeps the success value adjacent to the call so `v, err := f()` reads naturally. The style decisions state the convention directly. An error in the first position or in the middle forces readers to re-map the signature at every call site and breaks the familiar guard pattern.

## Bad

```go
func Load(path string) (error, *Config) {
    if path == "" {
        return errors.New("empty path"), nil
    }
    return nil, &Config{}
}

type Config struct{}
```

## Good

```go
func Load(path string) (*Config, error) {
    if path == "" {
        return nil, errors.New("empty path")
    }
    return &Config{}, nil
}

type Config struct{}
```

## See Also

- [go-api-return-zero-on-error](api-return-zero-on-error.md) - what to return alongside the error
- [go-api-doc-errors](api-doc-errors.md) - documenting the errors callers can expect
