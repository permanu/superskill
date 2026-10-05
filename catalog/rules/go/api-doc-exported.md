---
id: go-api-doc-exported
lang: go
prefix: api
title: Document every exported declaration with a full sentence that starts with its name
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, godoc, exported, documentation]
  files: ["**/*.go"]
  symbols: []
related: [go-api-doc-errors, go-api-deprecate-marker]
sources:
  - title: Go Code Review Comments - Doc Comments
    url: https://go.dev/wiki/CodeReviewComments
  - title: Go Doc Comments
    url: https://go.dev/doc/comment
---
> Start each exported doc comment with the declared name and end it with a period.

## Why

Doc comments are the package's user interface: godoc and IDEs surface them, and a comment that starts with the name is searchable and readable when extracted from the source. The review guide requires doc comments for all top-level exported names, and the doc comment specification asks for complete sentences beginning with the declared symbol. A lowercase fragment without the name reads wrong the moment it appears in generated documentation.

## Bad

```go
// parses an HTTP request line.
func ParseRequest(line string) (*Request, error) { return nil, nil }

type Request struct{}
```

## Good

```go
// ParseRequest parses an HTTP request line into a Request.
func ParseRequest(line string) (*Request, error) { return nil, nil }

// Request describes a parsed request line.
type Request struct{}
```

## See Also

- [go-api-doc-errors](api-doc-errors.md) - documenting the errors a function returns
- [go-api-deprecate-marker](api-deprecate-marker.md) - the Deprecated paragraph convention
