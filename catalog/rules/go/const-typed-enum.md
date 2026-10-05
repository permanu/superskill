---
id: go-const-typed-enum
lang: go
prefix: const
title: Type an enum built with iota
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [iota, enum, typed constants, Status]
  files: ["**/*.go"]
  symbols: []
related: [go-const-iota-skip, go-const-bitflags]
sources:
  - title: The Go Programming Language Specification - Iota
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Constants
    url: https://go.dev/ref/spec
---
> Untyped enum constants flow into any integer context.

## Why

The specification says iota represents successive untyped integer constants whose value is the index of the respective ConstSpec, starting at zero, and that constants may be typed or untyped. Untyped constants take their type from context, so an untyped StatusPending can be passed anywhere an integer is expected. Typing the enum keeps the constants a distinct type and lets methods attach to it.

## Bad

```go
const (
    StatusPending = iota
    StatusDone
)
```

## Good

```go
type Status int

const (
    StatusPending Status = iota
    StatusDone
)
```

## See Also

- [go-const-iota-skip](const-iota-skip.md) - reserving values inside the sequence
- [go-const-bitflags](const-bitflags.md) - the power-of-two variant of the same generator
