---
id: go-api-zero-value-useful
lang: go
prefix: api
title: Design types so the zero value is ready to use
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [zero value, initialization, map, lazy init]
  files: ["**/*.go"]
  symbols: [nil]
related: [go-api-constructors-new, go-api-option-defaults]
sources:
  - title: Effective Go - Allocation with new
    url: https://go.dev/doc/effective_go
  - title: Go Doc Comments - Types
    url: https://go.dev/doc/comment
---
> Make the zero value usable, or document why it is not.

## Why

The zero value is the only constructor every caller already has, so making it work removes a New call and an error path. Effective Go describes the zero-value-is-useful property as transitive, with bytes.Buffer and sync.Mutex ready to use as declared. A type that panics or silently misbehaves at its zero value forces every caller to remember initialization; the doc comment conventions ask that any non-obvious zero-value meaning be documented.

## Bad

```go
type Set struct{ m map[string]bool }

func NewSet() *Set { return &Set{m: map[string]bool{}} }

func (s *Set) Add(v string) { s.m[v] = true }
```

## Good

```go
type Set struct{ m map[string]bool }

func (s *Set) Add(v string) {
    if s.m == nil {
        s.m = map[string]bool{}
    }
    s.m[v] = true
}
```

## See Also

- [go-api-constructors-new](api-constructors-new.md) - the constructor for values the zero value cannot express
- [go-api-option-defaults](api-option-defaults.md) - documenting zero-value defaults
