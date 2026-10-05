---
id: go-const-iota-scaling
lang: go
prefix: const
title: Derive scaled constants from iota instead of repeating numbers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [iota, scaling, KB, derived constants]
  files: ["**/*.go"]
  symbols: []
related: [go-const-iota-skip, go-const-bitflags]
sources:
  - title: The Go Programming Language Specification - Constant declarations
    url: https://go.dev/ref/spec
  - title: The Go Programming Language Specification - Iota
    url: https://go.dev/ref/spec
---
> One expression repeated by omission cannot disagree with itself.

## Why

The specification says that within a parenthesized const declaration an omitted expression list repeats the previous one, and that iota is the index of the respective ConstSpec. Repeating 1 << (10 * (iota + 1)) derives each scale from the same formula instead of restating hand-written numbers. A typo in one hand-copied value is invisible; the derived form cannot drift.

## Bad

```go
const (
    KB = 1024
    MB = 1048576
    GB = 1073741824
)
```

## Good

```go
const (
    KB = 1 << (10 * (iota + 1))
    MB
    GB
)
```

## See Also

- [go-const-iota-skip](const-iota-skip.md) - skipping an index in the same list
- [go-const-bitflags](const-bitflags.md) - shifting iota by one bit instead
