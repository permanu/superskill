---
id: go-num-div-zero
lang: go
prefix: num
title: Guard integer division against a zero divisor
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [division, zero, panic, integer]
  files: ["**/*.go"]
  symbols: []
related: [go-num-float-to-int, go-num-narrowing-overflow]
sources:
  - title: The Go Programming Language Specification - Arithmetic operators
    url: https://go.dev/ref/spec
---
> Integer division by zero panics; check the divisor first.

## Why

The specification states that if the divisor is zero at run time, a run-time panic occurs. A divisor that comes from a count, a length, or user input can be zero even when no test exercises that branch. Checking before the division turns a crash into an error the caller can handle.

## Bad

```go
func average(total, count int) int {
    return total / count
}
```

## Good

```go
import "errors"

func average(total, count int) (int, error) {
    if count == 0 {
        return 0, errors.New("average of zero items")
    }
    return total / count, nil
}
```

## See Also

- [go-num-float-to-int](num-float-to-int.md) - the conversion side of invalid numeric input
- [go-num-narrowing-overflow](num-narrowing-overflow.md) - the other silent integer trap
