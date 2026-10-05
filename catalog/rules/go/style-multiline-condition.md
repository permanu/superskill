---
id: go-style-multiline-condition
lang: go
prefix: style
title: Extract boolean operands instead of wrapping a condition
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [condition, boolean, wrapping, indentation]
  files: ["**/*.go"]
  symbols: []
related: [go-style-error-flow, go-style-literal-braces]
sources:
  - title: Google Go Style Decisions - Conditionals and loops
    url: https://google.github.io/styleguide/go/decisions
  - title: Go Code Review Comments - Line Length
    url: https://go.dev/wiki/CodeReviewComments
---
> Name the sub-conditions so the if fits on one line.

## Why

A wrapped condition's continuation lines land at the same indentation as the block body, which is exactly the indentation confusion the style decisions warn about. Naming each operand states what the condition means and keeps the if header on one line, so the body's indentation is unambiguous. The style decisions offer this rewrite when short-circuit behavior is not required, because naming the operands evaluates both of them unconditionally.

## Bad

```go
func visible(user string, inTx bool) bool {
    if user == "admin" &&
        inTx {
        return true
    }
    return false
}
```

## Good

```go
func visible(user string, inTx bool) bool {
    isAdmin := user == "admin"
    if isAdmin && inTx {
        return true
    }
    return false
}
```

## See Also

- [go-style-error-flow](style-error-flow.md) - keeping the body at minimal indentation
- [go-style-literal-braces](style-literal-braces.md) - the same brace discipline elsewhere
