---
id: c-unsafe-shift-range
lang: c
prefix: unsafe
title: Keep shift counts inside the operand's width
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shift, bit width, undefined behavior, mask]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-unsafe-divide-zero, c-err-ckd-arithmetic]
sources:
  - title: SEI CERT C - INT34-C, do not shift an expression by a negative number of bits or by greater than or equal to the number of bits that exist in the operand
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int34-c/
---
> Validate every shift count against the promoted operand's precision before shifting.

## Why

If the right operand of `<<` or `>>` is negative or at least the width of the promoted left operand, the behavior is undefined, and the optimizer is free to exploit that assumption. Shift counts frequently come from parsed fields or computed masks, where the invalid values are exactly the ones a bug produces. A range check before the shift turns the undefined case into a reported error.

## Bad

```c
unsigned mask_for(int bits) {
    return 1u << bits;   /* bits < 0 or >= 32: undefined behavior */
}
```

## Good

```c
#include <limits.h>

unsigned mask_for(int bits) {
    if (bits < 0 || bits >= (int)(sizeof(unsigned) * CHAR_BIT)) {
        return 0;   /* shift count must be inside the operand width */
    }
    return 1u << bits;
}
```

## See Also

- [c-unsafe-divide-zero](unsafe-divide-zero.md) - the other arithmetic operand that needs a range check
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - checked arithmetic for values that feed shifts
