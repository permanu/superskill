---
id: go-style-dot-import
lang: go
prefix: style
title: Never use a dot import outside a test that needs it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import dot, namespace, test, collision]
  files: ["**/*.go"]
  symbols: []
related: [go-style-import-rename, go-style-gofmt]
sources:
  - title: Go Code Review Comments - Import Dot
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Import dot
    url: https://google.github.io/styleguide/go/decisions
---
> Import namespaces normally; the dot form makes every identifier ambiguous.

## Why

With a dot import, no reader can tell whether a name is defined in this package or another one, which breaks both reading and tooling. The review guide allows the form only for tests that cannot be part of the package under test because of circular dependencies. The style decisions go further and rule it out entirely for their codebase; outside that exception, always qualify.

## Bad

```go
import . "strings"

func has(s string) bool { return Contains(s, "x") }
```

## Good

```go
import "strings"

func has(s string) bool { return strings.Contains(s, "x") }
```

## See Also

- [go-style-import-rename](style-import-rename.md) - the milder form of obscuring a package name
- [go-style-gofmt](style-gofmt.md) - mechanical import handling
