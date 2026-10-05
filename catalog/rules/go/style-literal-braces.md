---
id: go-style-literal-braces
lang: go
prefix: style
title: Put the closing brace of a multi-line literal on its own line
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [composite literal, braces, formatting]
  files: ["**/*.go"]
  symbols: []
related: [go-style-gofmt, go-style-multiline-condition]
sources:
  - title: Google Go Style Decisions - Matching braces
    url: https://google.github.io/styleguide/go/decisions
  - title: Go Code Review Comments - Gofmt
    url: https://go.dev/wiki/CodeReviewComments
---
> Align the closing brace with the opening line of the literal.

## Why

The style decisions require a multi-line literal's closing brace to appear at the same indentation as its opening line, the same shape as every other brace pair in Go. Cuddling the brace onto the last element hides where the literal ends and makes later edits easy to misplace. The rule costs one line and keeps brace matching mechanical for both readers and diff tools.

## Bad

```go
type Point struct{ X, Y int }

var points = []Point{
    {X: 1, Y: 2},
    {X: 3, Y: 4}}
```

## Good

```go
type Point struct{ X, Y int }

var points = []Point{
    {X: 1, Y: 2},
    {X: 3, Y: 4},
}
```

## See Also

- [go-style-gofmt](style-gofmt.md) - gofmt cannot move this brace for you
- [go-style-multiline-condition](style-multiline-condition.md) - the same brace discipline for conditions
