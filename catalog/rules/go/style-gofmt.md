---
id: go-style-gofmt
lang: go
prefix: style
title: Format Go code with gofmt instead of hand-aligning it
severity: should
enforce: tool
tool: gofmt
baseline: latest
status: verified
triggers:
  keywords: [gofmt, formatting, alignment, imports]
  files: ["**/*.go"]
  symbols: [gofmt]
related: [go-style-import-rename, go-style-literal-braces]
sources:
  - title: Go Code Review Comments - Gofmt
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Guide - Formatting
    url: https://google.github.io/styleguide/go/
---
> Let gofmt own layout; never hand-align columns or spacing.

## Why

The review guide says almost all Go code in the wild is gofmt-formatted, so running it removes mechanical style from review entirely. Hand-aligned columns drift the moment a field name changes, and diffs then mix formatting churn with behavior. gofmt also settles indentation, spacing, and comment placement mechanically, which is why no style rule in this pack needs to cover them.

## Bad

```go
type Config struct {
    name string // name of the object
    value int // its value
}
```

## Good

```go
type Config struct {
    name  string // name of the object
    value int    // its value
}
```

## See Also

- [go-style-import-rename](style-import-rename.md) - goimports also fixes import naming and ordering
- [go-style-literal-braces](style-literal-braces.md) - layout rules gofmt cannot infer
