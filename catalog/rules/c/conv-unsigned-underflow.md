---
id: c-conv-unsigned-underflow
lang: c
prefix: conv
title: Compare before subtracting unsigned values
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unsigned, underflow, subtraction, wrap]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-mixed-signs, c-err-ckd-arithmetic]
sources:
  - title: SEI CERT C - INT30-C, ensure that unsigned integer operations do not wrap
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int30-c/
---
> Test the order of operands before subtracting unsigned values; the result wraps instead of going negative.

## Why

Unsigned arithmetic is modular: subtracting a larger value from a smaller one yields a huge positive number rather than a negative one. A remaining-bytes or remaining-capacity computation then hands an enormous count to a copy or allocation. Compare first, and decide what the difference means when the subtrahend exceeds the minuend.

## Bad

```c
#include <stddef.h>

size_t remaining(size_t total, size_t used) {
    return total - used;   /* wraps if used > total */
}
```

## Good

```c
#include <stddef.h>

size_t remaining(size_t total, size_t used) {
    if (used > total) {
        return 0;          /* clamp before subtracting */
    }
    return total - used;
}
```

## See Also

- [c-conv-mixed-signs](conv-mixed-signs.md) - negative signed values joining the unsigned domain
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - checked arithmetic for sizes that must not wrap
