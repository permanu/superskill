---
id: go-doc-no-nested-lists
lang: go
prefix: doc
title: Avoid nested lists in doc comments
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, lists, nesting, gofmt]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-no-html, go-doc-field-comments]
sources:
  - title: Go Doc Comments - Common mistakes and pitfalls
    url: https://go.dev/doc/comment
  - title: Go Doc Comments - Lists
    url: https://go.dev/doc/comment
---
> Doc comments have no nested lists; gofmt flattens them into one level.

## Why

The guide states that Go doc comments do not support nested lists, so gofmt reformats them into a single flat list when it rewrites the comment. It adds that rewriting the text to avoid nested lists usually improves the documentation. Merging the sub-points into the parent item, or moving structured detail into an indented code block, expresses the same content at the one level the syntax supports.

## Bad

```go
// Clean applies these rules:
//
//  - Replace runs of slashes.
//    * Leading runs become one slash.
//    * Trailing runs are dropped.
//  - Remove dot elements.
func Clean(path string) string {
    return path
}
```

## Good

```go
// Clean applies these rules:
//
//  - Replace runs of slashes, keeping one leading slash and dropping
//    trailing ones.
//  - Remove dot elements.
func Clean(path string) string {
    return path
}
```

## See Also

- [go-doc-no-html](doc-no-html.md) - the other syntax limit of doc comments
- [go-doc-field-comments](doc-field-comments.md) - where field detail belongs instead
