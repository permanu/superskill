---
id: go-api-deprecate-marker
lang: go
prefix: api
title: Mark deprecated APIs with a Deprecated paragraph in the doc comment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecation, doc comment, migration, API]
  files: ["**/*.go"]
  symbols: [Deprecated]
related: [go-api-doc-exported, go-api-unexport-unsupported]
sources:
  - title: Go Doc Comments - Deprecations
    url: https://go.dev/doc/comment
  - title: Go 1 and the Future of Go Programs
    url: https://go.dev/doc/go1compat
---
> Mark deprecated identifiers with a Deprecated paragraph that names the replacement.

## Why

Tools recognize paragraphs beginning with `Deprecated:` and warn at call sites; pkg.go.dev hides deprecated documentation by default. The doc comment specification defines the marker and asks for a recommendation of what to use instead. A prose note such as "old, use Parse" carries no machine-readable signal and no migration path, so callers keep using the identifier long after it was replaced.

## Bad

```go
// ParseV1 is old. Use Parse instead.
func ParseV1(s string) (int, error) { return Parse(s) }

func Parse(s string) (int, error) { return 0, nil }
```

## Good

```go
// ParseV1 parses s.
//
// Deprecated: use Parse instead.
func ParseV1(s string) (int, error) { return Parse(s) }

func Parse(s string) (int, error) { return 0, nil }
```

## See Also

- [go-api-doc-exported](api-doc-exported.md) - the doc comment conventions this marker extends
- [go-api-unexport-unsupported](api-unexport-unsupported.md) - removing API you never supported
