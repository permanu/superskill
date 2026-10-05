---
id: go-const-iota-skip
lang: go
prefix: const
title: Reserve iota values with the blank identifier
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [iota, blank identifier, reserve, zero value]
  files: ["**/*.go"]
  symbols: []
related: [go-const-typed-enum, go-const-iota-scaling]
sources:
  - title: The Go Programming Language Specification - Iota
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Constant declarations
    url: https://go.dev/ref/spec
---
> A skipped index keeps numbering stable and the zero slot honest.

## Why

The specification says iota's value is the index of the respective ConstSpec in the constant declaration, starting at zero. Skipping a value with the blank identifier reserves the zero slot for unset and keeps the numbering stable when a later constant is inserted. Without the skip, the zero value silently doubles as the first real constant.

## Bad

```go
const (
    PriorityNone = iota // 0 means unset but is also a real priority
    PriorityLow
    PriorityHigh
)
```

## Good

```go
const (
    _ = iota // 0 is reserved for unset
    PriorityLow
    PriorityHigh
)
```

## See Also

- [go-const-typed-enum](const-typed-enum.md) - typing the sequence this skip belongs to
- [go-const-iota-scaling](const-iota-scaling.md) - deriving values from the same index
