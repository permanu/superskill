---
id: go-num-narrowing-overflow
lang: go
prefix: num
title: Range-check values before narrowing integer conversions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [conversion, truncation, overflow, int8]
  files: ["**/*.go"]
  symbols: []
related: [go-num-float-to-int, go-num-div-zero]
sources:
  - title: The Go Programming Language Specification - Conversions
    url: https://go.dev/ref/spec
  - title: Package math - integer limits
    url: https://pkg.go.dev/math
---
> Narrowing truncates silently; compare against the destination bounds first.

## Why

For non-constant integer conversions the specification says the value is sign or zero extended to infinite precision and then truncated to fit the result type, and that the conversion always yields a valid value with no indication of overflow. Narrowing a value that came from a wider domain therefore corrupts data silently. Comparing against the destination type's bounds before converting keeps the failure visible.

## Bad

```go
func toInt8(n int64) int8 {
    return int8(n)
}
```

## Good

```go
import (
    "errors"
    "math"
)

func toInt8(n int64) (int8, error) {
    if n < math.MinInt8 || n > math.MaxInt8 {
        return 0, errors.New("value out of int8 range")
    }
    return int8(n), nil
}
```

## See Also

- [go-num-float-to-int](num-float-to-int.md) - the floating-point version of the same conversion trap
- [go-num-div-zero](num-div-zero.md) - the arithmetic operator that panics instead of wrapping
