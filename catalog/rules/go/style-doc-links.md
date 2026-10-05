---
id: go-style-doc-links
lang: go
prefix: style
title: Link identifiers in doc comments with square brackets
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, links, godoc, brackets]
  files: ["**/*.go"]
  symbols: []
related: [go-api-doc-exported, go-style-name-repetition]
sources:
  - title: Go Doc Comments - Doc links
    url: https://go.dev/doc/comment
  - title: Go Code Review Comments - Doc Comments
    url: https://go.dev/wiki/CodeReviewComments
---
> Write [Name] instead of a bare or backquoted identifier in doc comments.

## Why

The doc comment syntax turns [Name] into a link to that symbol on pkg.go.dev and in editors, while a backquoted or plain name stays inert text. The specification defines the form for local symbols, qualified symbols such as [io.EOF], and whole packages. Links keep related documentation one click away and survive renames because tools resolve them.

## Bad

```go
// Decode reads a value; see `Parse` for the input format.
func Decode(s string) (int, error) { return Parse(s) }

func Parse(s string) (int, error) { return 0, nil }
```

## Good

```go
// Decode reads a value; see [Parse] for the input format.
func Decode(s string) (int, error) { return Parse(s) }

func Parse(s string) (int, error) { return 0, nil }
```

## See Also

- [go-api-doc-exported](api-doc-exported.md) - the comment this link lives in
- [go-style-name-repetition](style-name-repetition.md) - the same economy applied to identifiers
