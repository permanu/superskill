---
id: go-style-error-flow
lang: go
prefix: style
title: Handle errors before the happy path and drop the else
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error handling, indentation, else, early return]
  files: ["**/*.go"]
  symbols: []
related: [go-style-multiline-condition, go-err-no-ignore]
sources:
  - title: Go Code Review Comments - Indent Error Flow
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Indent error flow
    url: https://google.github.io/styleguide/go/decisions
---
> Let the error path return early so the normal path stays at the lowest indentation.

## Why

Readers scan the happy path, so every extra indentation level makes them work to find it. The review guide asks code to handle the error first and let normal execution run down the page; the style decisions extend that to any block ending in return, break, or panic. An else after a terminal block adds an indentation level that carries no meaning.

## Bad

```go
func load(name string) ([]byte, error) {
    data, err := os.ReadFile(name)
    if err != nil {
        return nil, fmt.Errorf("load: %w", err)
    } else {
        return data, nil
    }
}
```

## Good

```go
func load(name string) ([]byte, error) {
    data, err := os.ReadFile(name)
    if err != nil {
        return nil, fmt.Errorf("load: %w", err)
    }
    return data, nil
}
```

## See Also

- [go-style-multiline-condition](style-multiline-condition.md) - the same indentation concern for conditions
- [go-err-no-ignore](err-no-ignore.md) - what the early return must do with the error
