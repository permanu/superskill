---
id: go-type-named-units
lang: go
prefix: type
title: Give units their own types so arguments cannot be swapped
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [named type, units, parameters, type safety]
  files: ["**/*.go"]
  symbols: []
related: [go-type-definition-over-alias, go-type-make-for-reference]
sources:
  - title: The Go Programming Language Specification - Type definitions
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Type identity
    url: https://go.dev/ref/spec
---
> Milliseconds and Retries do not convert to each other implicitly.

## Why

The specification says a defined type is different from any other type, including the type it is created from, and that all named types are distinct. Two parameters typed int therefore accept each other's values, while Milliseconds and Retries do not, even though both have the same underlying type. Naming the units turns a swapped argument from a silent bug into a compile error.

## Bad

```go
func setTimeout(ms int, retries int) {}
```

## Good

```go
type Milliseconds int

type Retries int

func setTimeout(ms Milliseconds, retries Retries) {}
```

## See Also

- [go-type-definition-over-alias](type-definition-over-alias.md) - definition versus alias
- [go-type-make-for-reference](type-make-for-reference.md) - initializing the reference types that hold these values
