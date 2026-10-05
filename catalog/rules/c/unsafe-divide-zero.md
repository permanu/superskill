---
id: c-unsafe-divide-zero
lang: c
prefix: unsafe
title: Guard every division and remainder by a nonzero divisor
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [division, modulo, divide by zero, divisor]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-shift-range, c-err-ckd-arithmetic]
sources:
  - title: SEI CERT C - INT33-C, ensure that division and remainder operations do not result in divide-by-zero errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int33-c/
---
> Test the divisor before `/` and `%`; a zero divisor is undefined behavior, not an exception.

## Why

The second operand of `/` or `%` being zero is undefined behavior, so the program can crash, return garbage, or be optimized in ways that skip the check entirely. Divisors come from counts, differences, or parsed values that reach zero on empty input or exact matches. Validate the divisor where it is computed and return an error instead of dividing.

## Bad

```c
int average(const int *values, int n) {
    int sum = 0;
    for (int i = 0; i < n; ++i) {
        sum += values[i];
    }
    return sum / n;   /* n == 0 divides by zero */
}
```

## Good

```c
int average(const int *values, int n, int *out) {
    if (n <= 0) {
        return -1;
    }
    int sum = 0;
    for (int i = 0; i < n; ++i) {
        sum += values[i];
    }
    *out = sum / n;
    return 0;
}
```

## See Also

- [c-unsafe-shift-range](unsafe-shift-range.md) - the other arithmetic precondition on an operand
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - checked arithmetic for the surrounding computation
