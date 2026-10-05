---
id: go-num-float-to-int
lang: go
prefix: num
title: Range-check floats before converting to integers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [conversion, float64, NaN, truncation]
  files: ["**/*.go"]
  symbols: []
related: [go-num-nan-comparison, go-num-narrowing-overflow]
sources:
  - title: The Go Programming Language Specification - Conversions
    url: https://go.dev/ref/spec
  - title: Package math - IsNaN
    url: https://pkg.go.dev/math
---
> Out-of-range and NaN float conversions produce an unspecified int.

## Why

The specification says a float-to-integer conversion discards the fraction by truncating towards zero, and that when the result type cannot represent the value the conversion succeeds but the result is implementation-dependent. NaN has no integer value at all and out-of-range magnitudes silently produce an unspecified number. Checking NaN and the type bounds first turns those cases into an error.

## Bad

```go
func toInt64(f float64) int64 {
    return int64(f)
}
```

## Good

```go
import (
    "errors"
    "math"
)

func toInt64(f float64) (int64, error) {
    if math.IsNaN(f) || f >= float64(math.MaxInt64) || f < float64(math.MinInt64) {
        return 0, errors.New("value out of int64 range")
    }
    return int64(f), nil
}
```

## See Also

- [go-num-nan-comparison](num-nan-comparison.md) - why NaN needs its own test
- [go-num-narrowing-overflow](num-narrowing-overflow.md) - the integer-to-integer version
