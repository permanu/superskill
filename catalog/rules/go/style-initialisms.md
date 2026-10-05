---
id: go-style-initialisms
lang: go
prefix: style
title: Keep initialism case consistent in identifiers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [initialism, acronym, naming, URL, ID]
  files: ["**/*.go"]
  symbols: []
related: [go-style-constant-names, go-style-receiver-name]
sources:
  - title: Go Code Review Comments - Initialisms
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Initialisms
    url: https://google.github.io/styleguide/go/decisions
---
> Write URL, ID, and HTTP in one case throughout an identifier.

## Why

An initialism keeps its case in every position, so the exported type is HTTPClient and the field is urlPony, never HttpClient or UrlPony. The review guide lists URL and NATO as the canonical examples and applies the same rule to ID. Mixed casing splits identifiers across search results and looks like a different name in godoc.

## Bad

```go
type HttpClient struct{ id string }

func (c *HttpClient) Id() string { return c.id }
```

## Good

```go
type HTTPClient struct{ id string }

func (c *HTTPClient) ID() string { return c.id }
```

## See Also

- [go-style-constant-names](style-constant-names.md) - the same casing discipline for constants
- [go-style-receiver-name](style-receiver-name.md) - naming the receiver of the renamed type
