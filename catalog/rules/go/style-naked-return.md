---
id: go-style-naked-return
lang: go
prefix: style
title: Avoid naked returns once the function is more than a few lines
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naked return, named results, readability]
  files: ["**/*.go"]
  symbols: []
related: [go-style-error-flow, go-style-variable-scope]
sources:
  - title: Go Code Review Comments - Naked Returns
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Named result parameters
    url: https://google.github.io/styleguide/go/decisions
---
> Return values explicitly in any function longer than a handful of lines.

## Why

A bare return makes the reader scroll back to the signature to learn what is being returned, and the style decisions say naked returns are acceptable only in a small function. Named results still document the values and remain required when a deferred closure must change one, but they should not exist just to enable the bare form. Explicit returns keep each exit point readable on its own.

## Bad

```go
func split(sum int) (x, y int) {
    x = sum * 4 / 9
    y = sum - x
    if y < 0 {
        y = 0
        return
    }
    return
}
```

## Good

```go
func split(sum int) (int, int) {
    x := sum * 4 / 9
    y := sum - x
    if y < 0 {
        y = 0
    }
    return x, y
}
```

## See Also

- [go-style-error-flow](style-error-flow.md) - explicit returns keep exit points scannable
- [go-style-variable-scope](style-variable-scope.md) - naming the locals this rewrite introduces
