---
id: go-style-receiver-name
lang: go
prefix: style
title: Name method receivers after the type, never this or self
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [receiver, naming, this, self]
  files: ["**/*.go"]
  symbols: []
related: [go-style-variable-scope, go-style-initialisms]
sources:
  - title: Go Code Review Comments - Receiver Names
    url: https://go.dev/wiki/CodeReviewComments
  - title: Google Go Style Decisions - Receiver names
    url: https://google.github.io/styleguide/go/decisions
---
> Use a short abbreviation of the receiver type, and use the same one in every method.

## Why

In Go the receiver is an ordinary parameter, so this and self import object-oriented meaning the language does not have. The review guide asks for a one- or two-letter abbreviation of the type, applied consistently across the method set. Consistency matters more than the specific letters: mixed names make readers re-check which value a method operates on.

## Bad

```go
type Client struct{ addr string }

func (self *Client) Do() error { return nil }
```

## Good

```go
type Client struct{ addr string }

func (c *Client) Do() error { return nil }
```

## See Also

- [go-style-variable-scope](style-variable-scope.md) - the same brevity rule for locals
- [go-style-initialisms](style-initialisms.md) - casing rules for the type name itself
