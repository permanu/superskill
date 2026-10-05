---
id: go-doc-field-comments
lang: go
prefix: doc
title: Explain exported struct fields in comments
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, struct fields, units, defaults]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-behavior-not-implementation, go-doc-concurrency-note]
sources:
  - title: Go Doc Comments - Types
    url: https://go.dev/doc/comment
---
> Units, defaults, and allowed values belong next to the field they constrain.

## Why

The guide says that for a struct with exported fields, either the doc comment or per-field comments should explain the meaning of each exported field. Fields like Timeout and Retries carry units and defaults that the field type alone cannot express. Per-field comments put the explanation beside the declaration, where editors and pkg.go.dev show it with the field.

## Bad

```go
type Config struct {
    Timeout int
    Retries int
}
```

## Good

```go
type Config struct {
    Timeout int // seconds to wait before the first attempt
    Retries int // attempts after the first failure
}
```

## See Also

- [go-doc-behavior-not-implementation](doc-behavior-not-implementation.md) - documenting the contract rather than internals
- [go-doc-concurrency-note](doc-concurrency-note.md) - the other guarantee a type should state
