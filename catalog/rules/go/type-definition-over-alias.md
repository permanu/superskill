---
id: go-type-definition-over-alias
lang: go
prefix: type
title: Define a new type when it must have its own identity
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type definition, alias, distinct type, methods]
  files: ["**/*.go"]
  symbols: []
related: [go-type-named-units, go-type-interface-comparison]
sources:
  - title: The Go Programming Language Specification - Type definitions
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Type identity
    url: https://go.dev/ref/spec
---
> A definition creates a distinct type; an alias only renames the old one.

## Why

The specification says the new type in a type definition is different from any other type, including the type it is created from, and that all named types are distinct. An alias declaration introduces another name for the same type, so it adds no identity, no methods, and no protection against mixing. Use a definition when the type is meant to be its own thing, and an alias only for migrations that must stay the same type.

## Bad

```go
type Duration = int64
```

## Good

```go
type Duration int64

func (d Duration) Seconds() float64 { return float64(d) / 1e9 }
```

## See Also

- [go-type-named-units](type-named-units.md) - using distinct types to prevent argument mixups
- [go-type-interface-comparison](type-interface-comparison.md) - why type identity matters at run time
