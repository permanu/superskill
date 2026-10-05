---
id: c-num-integer-truncation
lang: c
prefix: num
title: Account for integer division truncating toward zero
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [division, truncation, remainder, negative]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-unsigned-underflow, c-num-signed-overflow]
sources:
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/c/language/operator_arithmetic
---
> Treat `/` and `%` as truncation toward zero and adjust explicitly when floor semantics are needed.

## Why

For integers, `/` yields the algebraic quotient truncated toward zero, and `%` is defined so that `(a/b)*b + a%b == a`, which means the remainder takes the sign of the dividend. Code that assumes mathematical floor division or a non-negative remainder misrounds every negative input. When the domain needs floor or Euclidean semantics, adjust the result explicitly.

## Bad

```c
int half(int value) {
    return value / 2;   /* truncates toward zero: -3 / 2 == -1 */
}
```

## Good

```c
int half_floor(int value) {
    int q = value / 2;          /* C truncates toward zero */
    if (value < 0 && value % 2 != 0) {
        --q;                    /* adjust to floor for negative odd values */
    }
    return q;
}
```

## See Also

- [c-conv-unsigned-underflow](conv-unsigned-underflow.md) - the unsigned side of division and subtraction
- [c-num-signed-overflow](num-signed-overflow.md) - overflow in the surrounding arithmetic
