---
id: c-num-int-min-division
lang: c
prefix: num
title: Guard the most-negative value before dividing or taking a remainder by minus one
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [INT_MIN, division, overflow, remainder]
  files: ["**/*.c", "**/*.h"]
  symbols: [INT_MIN]
related: [c-unsafe-divide-zero, c-num-signed-overflow]
sources:
  - title: SEI CERT C - INT33-C, ensure that division and remainder operations do not result in divide-by-zero errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int33-c/
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/c/language/operator_arithmetic
---
> Reject the `MIN / -1` and `MIN % -1` cases; the quotient is not representable.

## Why

The most-negative value of a signed type has no positive counterpart, so dividing or taking the remainder by -1 produces a result outside the type's range and is undefined behavior. CERT's division rule covers this alongside divide-by-zero, and cppreference notes both operators are undefined when the quotient is not representable. Check the operands before the operation.

## Bad

```c
int negate_ratio(int value) {
    return value / -1;   /* INT_MIN / -1 overflows */
}
```

## Good

```c
#include <limits.h>

int negate_ratio(int value, int *out) {
    if (value == INT_MIN) {
        return -1;   /* the negation cannot be represented */
    }
    *out = value / -1;
    return 0;
}
```

## See Also

- [c-unsafe-divide-zero](unsafe-divide-zero.md) - the zero divisor next to this case
- [c-num-signed-overflow](num-signed-overflow.md) - the general signed overflow rule
