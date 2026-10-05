---
id: go-doc-no-html
lang: go
prefix: doc
title: Write doc comments in the supported syntax, not HTML
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, HTML, markdown, syntax]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-no-nested-lists, go-style-doc-links]
sources:
  - title: Go Doc Comments - Syntax
    url: https://go.dev/doc/comment
---
> Doc syntax is paragraphs, headings, links, lists, and code blocks only.

## Why

The guide describes the doc comment syntax as paragraphs, headings, links, lists, and preformatted code blocks, and says there is no support for complex features like font changes or raw HTML. HTML tags are therefore not rendered; they appear literally in go doc output and on pkg.go.dev. Emphasis expressed by wording rather than markup survives every renderer.

## Bad

```go
// <b>Parse</b> decodes the request body into a Request.
func Parse(data []byte) (*Request, error) {
    return nil, nil
}

type Request struct{}
```

## Good

```go
// Parse decodes the request body into a Request.
func Parse(data []byte) (*Request, error) {
    return nil, nil
}

type Request struct{}
```

## See Also

- [go-doc-no-nested-lists](doc-no-nested-lists.md) - the other syntax limit worth knowing
- [go-style-doc-links](style-doc-links.md) - the supported way to reference other symbols
