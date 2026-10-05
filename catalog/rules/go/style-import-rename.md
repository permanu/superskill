---
id: go-style-import-rename
lang: go
prefix: style
title: Rename imports only to avoid a collision
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import, rename, alias, collision]
  files: ["**/*.go"]
  symbols: []
related: [go-style-gofmt, go-style-dot-import]
sources:
  - title: Go Code Review Comments - Imports
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Import renaming
    url: https://google.github.io/styleguide/go/decisions
---
> Use the package's own name unless another import claims it.

## Why

A good package name needs no help, and an alias hides which package a call reaches. The review guide says to avoid renaming except to avoid a collision, preferring to rename the most local or project-specific import. When a rename is unavoidable, the style decisions ask for a consistent local name across files, with the pkg suffix as the fallback.

## Bad

```go
import format "fmt"

func log(v any) { format.Println(v) }
```

## Good

```go
import "fmt"

func log(v any) { fmt.Println(v) }
```

## See Also

- [go-style-gofmt](style-gofmt.md) - goimports also manages the import list
- [go-style-dot-import](style-dot-import.md) - the most extreme form of hiding the package name
