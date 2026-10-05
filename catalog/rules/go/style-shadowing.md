---
id: go-style-shadowing
lang: go
prefix: style
title: Do not shadow package names or outer variables
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shadowing, scope, package name, variable]
  files: ["**/*.go"]
  symbols: []
related: [go-style-variable-scope, go-style-import-rename]
sources:
  - title: Google Go Style Best Practices - Shadowing
    url: https://google.github.io/styleguide/go/best-practices
  - title: Go Code Review Comments - Variable Names
    url: https://go.dev/wiki/CodeReviewComments
---
> Keep package names and outer variables visible; pick a distinct local name instead.

## Why

A local named url makes the net/url package unreachable for the rest of the function, and a shadowed outer variable makes the next read of that name refer to something else. The style guide calls shadowing a source of bugs and recommends a new name whenever it improves clarity. Renaming the local is always cheaper than tracing which binding a line uses.

## Bad

```go
func fetch() string {
    url := "https://example.com"
    return url
}
```

## Good

```go
func fetch() string {
    rawURL := "https://example.com"
    return rawURL
}
```

## See Also

- [go-style-variable-scope](style-variable-scope.md) - naming locals so they do not collide
- [go-style-import-rename](style-import-rename.md) - what to do when an import name collides
