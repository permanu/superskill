---
id: go-api-option-defaults
lang: go
prefix: api
title: Document the default value of every optional option field
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [options, defaults, documentation, struct fields]
  files: ["**/*.go"]
  symbols: [Options]
related: [go-api-options-struct, go-api-zero-value-useful]
sources:
  - title: Google Go Style Best Practices - Parameters and configuration
    url: https://google.github.io/styleguide/go/best-practices
  - title: Google Go Style Decisions - Zero-value fields
    url: https://google.github.io/styleguide/go/decisions
---
> State each optional field's default where the field is declared.

## Why

With an option struct, a zero field means "use the default", so callers must know the default to decide whether to set it. The style guide asks documentation to explain non-obvious fields and parameters, and its struct-literal guidance assumes zero-value fields can be omitted when their meaning is clear. A default hidden in the implementation forces every caller to read the constructor.

## Bad

```go
type Options struct {
    Timeout time.Duration
    Retries int
}
```

## Good

```go
type Options struct {
    Timeout time.Duration // optional; default: 30s
    Retries int           // optional; default: 3
}
```

## See Also

- [go-api-options-struct](api-options-struct.md) - the structure these fields belong to
- [go-api-zero-value-useful](api-zero-value-useful.md) - making zero values meaningful
