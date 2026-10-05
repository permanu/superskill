---
id: go-num-nan-comparison
lang: go
prefix: num
title: Handle NaN explicitly in float comparisons
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NaN, float64, IEEE 754, comparison]
  files: ["**/*.go"]
  symbols: [math.IsNaN]
related: [go-num-float-to-int, go-num-narrowing-overflow]
sources:
  - title: The Go Programming Language Specification - Comparison operators
    url: https://go.dev/ref/spec
  - title: Package math - IsNaN
    url: https://pkg.go.dev/math
---
> NaN is unequal to everything, itself included; test with math.IsNaN.

## Why

The specification says two floating-point values are compared as defined by the IEEE 754 standard, under which a NaN is unequal to every value including itself. An equality check over a slice of measurements therefore never matches a NaN element, and a NaN target never matches anything. math.IsNaN is the explicit test that names the case instead of relying on a comparison that cannot succeed.

## Bad

```go
func contains(xs []float64, target float64) bool {
    for _, x := range xs {
        if x == target {
            return true
        }
    }
    return false
}
```

## Good

```go
import "math"

func contains(xs []float64, target float64) bool {
    for _, x := range xs {
        if x == target || (math.IsNaN(x) && math.IsNaN(target)) {
            return true
        }
    }
    return false
}
```

## See Also

- [go-num-float-to-int](num-float-to-int.md) - the conversion that must reject NaN
- [go-num-narrowing-overflow](num-narrowing-overflow.md) - the integer conversion trap
