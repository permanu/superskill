---
id: go-doc-reports-whether
lang: go
prefix: doc
title: Describe boolean results with reports whether
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, boolean, reports whether, phrasing]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-behavior-not-implementation, go-api-doc-exported]
sources:
  - title: Go Doc Comments - Funcs
    url: https://go.dev/doc/comment
---
> Boolean functions report whether a condition holds; drop "or not".

## Why

The Go Doc Comments guide says doc comments typically use the phrase "reports whether" to describe functions that return a boolean, and that the phrase "or not" is unnecessary. The standard library follows the convention everywhere, so a function that reads differently stands out in generated documentation. "Returns whether or not" spends three words on a condition the signature already marks as a yes-or-no question.

## Bad

```go
// HasPrefix returns whether or not the string s begins with prefix.
func HasPrefix(s, prefix string) bool {
    return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
```

## Good

```go
// HasPrefix reports whether the string s begins with prefix.
func HasPrefix(s, prefix string) bool {
    return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
```

## See Also

- [go-doc-behavior-not-implementation](doc-behavior-not-implementation.md) - what the comment should describe
- [go-api-doc-exported](api-doc-exported.md) - the name-first convention for doc comments
