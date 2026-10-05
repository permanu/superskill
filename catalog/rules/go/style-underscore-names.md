---
id: go-style-underscore-names
lang: go
prefix: style
title: Do not put underscores in Go identifiers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [underscore, naming, snake case]
  files: ["**/*.go"]
  symbols: []
related: [go-style-constant-names, go-style-variable-scope]
sources:
  - title: Google Go Style Decisions - Underscores
    url: https://google.github.io/styleguide/go/decisions
  - title: Go Code Review Comments - Mixed Caps
    url: https://go.dev/wiki/CodeReviewComments
---
> Use MixedCaps for identifiers; underscores are reserved for generated and test names.

## Why

Go identifiers use MixedCaps, so an underscore name looks foreign and breaks the case-based visibility convention. The style decisions allow underscores only in package names imported solely by generated code, in test and benchmark function names, and in low-level system interoperability. For everyday names the fix is mechanical: user_count becomes userCount.

## Bad

```go
var user_count int

func max_retries() int { return 3 }
```

## Good

```go
var userCount int

func maxRetries() int { return 3 }
```

## See Also

- [go-style-constant-names](style-constant-names.md) - casing rules for constants
- [go-style-variable-scope](style-variable-scope.md) - choosing the name once the underscores are gone
