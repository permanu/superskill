---
id: c-num-signed-overflow
lang: c
prefix: num
title: Check operands before signed arithmetic that can overflow
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signed overflow, int, addition, undefined behavior]
  files: ["**/*.c", "**/*.h"]
  symbols: [INT_MAX, INT_MIN]
related: [c-err-ckd-arithmetic, c-num-int-min-division]
sources:
  - title: SEI CERT C - INT32-C, ensure that operations on signed integers do not result in overflow
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int32-c/
---
> Test the operand ranges before signed addition, subtraction, and multiplication.

## Why

Signed integer overflow is undefined behavior, so the compiler may assume it never happens and optimize the check away, trap, or wrap depending on context. CERT lists the operators that can overflow and stresses that tainted values reaching sizes and indices make the result exploitable. A precondition test on the operands keeps the arithmetic defined.

## Bad

```c
int add(int a, int b) {
    return a + b;   /* signed overflow is undefined */
}
```

## Good

```c
#include <limits.h>

int add(int a, int b, int *out) {
    if ((b > 0 && a > INT_MAX - b) || (b < 0 && a < INT_MIN - b)) {
        return -1;   /* reject values outside the int range */
    }
    *out = a + b;
    return 0;
}
```

## See Also

- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - the checked-arithmetic macros for the same problem
- [c-num-int-min-division](num-int-min-division.md) - the overflow inside division
