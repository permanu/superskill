---
id: go-const-bitflags
lang: go
prefix: const
title: Build combinable flags with 1 << iota
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bit flags, iota, shifts, combination]
  files: ["**/*.go"]
  symbols: []
related: [go-const-typed-enum, go-const-iota-scaling]
sources:
  - title: The Go Programming Language Specification - Iota
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Arithmetic operators
    url: https://go.dev/ref/spec
---
> Powers of two make each flag one bit and insertions cheap.

## Why

The specification says iota represents successive untyped integer constants, which makes it the natural generator for bit flags. Writing 1 << iota keeps each flag a single bit and leaves room to insert one without renumbering. Typing the flags keeps them out of unrelated integer contexts while still allowing | and &.

## Bad

```go
const (
    FlagRead  = 1
    FlagWrite = 2
)
```

## Good

```go
type Flag uint

const (
    FlagRead Flag = 1 << iota
    FlagWrite
)
```

## See Also

- [go-const-typed-enum](const-typed-enum.md) - the sequential variant of the same pattern
- [go-const-iota-scaling](const-iota-scaling.md) - shifting by a scale instead of one bit
