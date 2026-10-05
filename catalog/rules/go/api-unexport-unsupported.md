---
id: go-api-unexport-unsupported
lang: go
prefix: api
title: Unexport helpers you are not prepared to support as public API
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [export, API surface, compatibility, unexported]
  files: ["**/*.go"]
  symbols: []
related: [go-api-deprecate-marker, go-api-doc-exported]
sources:
  - title: Go 1 and the Future of Go Programs
    url: https://go.dev/doc/go1compat
  - title: Go Modules Reference - Major version suffixes
    url: https://go.dev/ref/mod
---
> Export only what you will keep compatible; keep helpers unexported.

## Why

Every exported name is a compatibility promise: changing its signature or meaning breaks callers, and removing it requires a new major version. The compatibility document describes the guarantee in exactly these terms, and the module system encodes breaking changes as new major versions. An exported helper that exists for tests or internal reuse creates that obligation without any user benefit.

## Bad

```go
func Parse(s string) (int, error) { return parseInternal(s) }

// ParseInternal exposes the parser for tests.
func ParseInternal(s string) (int, error) { return parseInternal(s) }

func parseInternal(s string) (int, error) { return 0, nil }
```

## Good

```go
func Parse(s string) (int, error) { return parseInternal(s) }

func parseInternal(s string) (int, error) { return 0, nil }
```

## See Also

- [go-api-deprecate-marker](api-deprecate-marker.md) - what to do when exported API must go away
- [go-api-doc-exported](api-doc-exported.md) - the documentation every exported name needs
