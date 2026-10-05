---
id: go-style-getter-name
lang: go
prefix: style
title: Name accessors after the field, without a Get prefix
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [getter, naming, accessor, field]
  files: ["**/*.go"]
  symbols: []
related: [go-style-name-repetition, go-api-constructors-new]
sources:
  - title: Effective Go - Getters
    url: https://go.dev/doc/effective_go
  - title: Google Go Style Decisions - Getters
    url: https://google.github.io/styleguide/go/decisions
---
> Expose a field as Name, not GetName, unless the concept is literally a get.

## Why

The exported identifier already marks the accessor, so Get adds no information and makes callers type more. Effective Go says it is neither idiomatic nor necessary to put Get in the getter's name, and the style decisions reserve the word for concepts that use it, such as an HTTP GET. When the accessor computes or fetches rather than reads, a verb like Fetch or Compute tells the caller it may block.

## Bad

```go
type User struct{ name string }

func (u *User) GetName() string { return u.name }
```

## Good

```go
type User struct{ name string }

func (u *User) Name() string { return u.name }
```

## See Also

- [go-style-name-repetition](style-name-repetition.md) - the broader rule against filler words
- [go-api-constructors-new](api-constructors-new.md) - naming constructors in the same spirit
