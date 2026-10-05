---
id: go-style-variable-scope
lang: go
prefix: style
title: Scale variable name length to the size of its scope
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, variables, scope, loop]
  files: ["**/*.go"]
  symbols: []
related: [go-style-receiver-name, go-style-name-repetition]
sources:
  - title: Go Code Review Comments - Variable Names
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Variable names
    url: https://google.github.io/styleguide/go/decisions
---
> Short names for short scopes; descriptive names only when distance from the declaration grows.

## Why

A name's job is to disambiguate, and a loop body with one variable needs almost no disambiguation. The review guide's rule is that the further a name is used from its declaration, the more descriptive it must be, and the style decisions give loop indices a single letter. Long names in tiny scopes add reading cost without adding information.

## Bad

```go
func sum(values []int) int {
    total := 0
    for sliceIndex := range values {
        total += values[sliceIndex]
    }
    return total
}
```

## Good

```go
func sum(values []int) int {
    total := 0
    for _, v := range values {
        total += v
    }
    return total
}
```

## See Also

- [go-style-receiver-name](style-receiver-name.md) - the shortest names belong to receivers
- [go-style-name-repetition](style-name-repetition.md) - avoiding words the context already supplies
