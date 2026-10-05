---
id: go-iface-canonical-name
lang: go
prefix: iface
title: Name conversion methods after the standard interface, not ToString or GetX
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [String method, naming, Stringer, getters]
  files: ["**/*.go"]
  symbols: [String]
related: [go-iface-stringer-no-recursion, go-iface-accept-narrow]
sources:
  - title: Effective Go - Interface names
    url: https://go.dev/doc/effective_go
  - title: Google Go Style Decisions - Getters
    url: https://google.github.io/styleguide/go/decisions
---
> Implement String for text conversion; do not invent ToString or Get prefixes.

## Why

Standard names carry standard meaning, so fmt and other packages recognize String, Read, Write, and Close automatically; a ToString method is invisible to them. Effective Go warns not to reuse canonical names with different signatures and says to call the string converter String, not ToString. The style guide similarly drops Get from accessor names unless the underlying concept uses the word.

## Bad

```go
type Point struct{ X, Y int }

func (p Point) ToString() string { return fmt.Sprintf("%d,%d", p.X, p.Y) }
```

## Good

```go
type Point struct{ X, Y int }

func (p Point) String() string { return fmt.Sprintf("%d,%d", p.X, p.Y) }
```

## See Also

- [go-iface-stringer-no-recursion](iface-stringer-no-recursion.md) - implementing String safely
- [go-iface-accept-narrow](iface-accept-narrow.md) - the interfaces whose names are worth honoring
