---
id: go-num-big-exact
lang: go
prefix: num
title: Use math/big when values can exceed machine integers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [math/big, big.Int, overflow, arbitrary precision]
  files: ["**/*.go"]
  symbols: [math/big.Int]
related: [go-num-narrowing-overflow, go-num-float-to-int]
sources:
  - title: Package math/big - Overview
    url: https://pkg.go.dev/math/big
  - title: The Go Programming Language Specification - Constants
    url: https://go.dev/ref/spec
---
> Constants are exact; runtime ints wrap; big.Int holds the overflow.

## Why

The math/big documentation describes the package as implementing arbitrary-precision arithmetic, with Int, Rat, and Float types whose zero value is ready to use. The specification notes that numeric constants are exact and do not overflow, but values computed at run time wrap once they leave the machine integer's range. Work whose results can exceed that range, such as factorials, large monetary totals, or cryptographic values, belongs in math/big.

## Bad

```go
func factorial(n int) int {
    f := 1
    for i := 2; i <= n; i++ {
        f *= i
    }
    return f
}
```

## Good

```go
import "math/big"

func factorial(n int) *big.Int {
    f := big.NewInt(1)
    for i := 2; i <= n; i++ {
        f.Mul(f, big.NewInt(int64(i)))
    }
    return f
}
```

## See Also

- [go-num-narrowing-overflow](num-narrowing-overflow.md) - the silent wrap when a value leaves the destination range
- [go-num-float-to-int](num-float-to-int.md) - the floating-point conversion that loses magnitude
