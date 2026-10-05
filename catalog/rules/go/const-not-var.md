---
id: go-const-not-var
lang: go
prefix: const
title: Use const for values that never change
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, var, immutability, compile time]
  files: ["**/*.go"]
  symbols: []
related: [go-const-untyped-flexible, go-const-typed-enum]
sources:
  - title: The Go Programming Language Specification - Constant expressions
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Constant declarations
    url: https://go.dev/ref/spec
---
> const has no storage and cannot be reassigned; var promises nothing.

## Why

The specification says constant expressions may contain only constant operands and are evaluated at compile time, and that a constant declaration binds identifiers to those expressions. A var has storage, can be reassigned from anywhere in the package, and carries no promise that its value is fixed. const makes the guarantee visible in the declaration and lets the compiler fold the value into callers.

## Bad

```go
var maxRetries = 3
```

## Good

```go
const maxRetries = 3
```

## See Also

- [go-const-untyped-flexible](const-untyped-flexible.md) - choosing the type of the constant
- [go-const-typed-enum](const-typed-enum.md) - constants that form a set
