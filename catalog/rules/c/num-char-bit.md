---
id: c-num-char-bit
lang: c
prefix: num
title: Express byte masks with UCHAR_MAX, not the literal 0xFF
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [UCHAR_MAX, CHAR_BIT, byte mask, portability]
  files: ["**/*.c", "**/*.h"]
  symbols: [UCHAR_MAX, CHAR_BIT]
related: [c-conv-bitwise-unsigned, c-num-float-model]
sources:
  - title: cppreference - Numeric limits
    url: https://en.cppreference.com/w/c/types/limits
---
> Mask bytes with UCHAR_MAX instead of assuming a byte is eight bits.

## Why

A byte is `CHAR_BIT` bits, which the standard does not fix at eight, and code that masks with `0xFF` hard-codes the assumption into bit manipulation, serialization, and checksums. `UCHAR_MAX` is the mask for exactly one byte and avoids shifting by `CHAR_BIT`, which would reach the width of `unsigned` on targets where the byte and the operand are the same size. Writing the mask in terms of it stays correct wherever a byte has another width.

## Bad

```c
unsigned low_byte(unsigned value) {
    return value & 0xFF;   /* assumes 8-bit bytes */
}
```

## Good

```c
#include <limits.h>

unsigned low_byte(unsigned value) {
    return value & (unsigned)UCHAR_MAX;   /* one byte, whatever its width */
}
```

## See Also

- [c-conv-bitwise-unsigned](conv-bitwise-unsigned.md) - the unsigned domain these masks need
- [c-num-float-model](num-float-model.md) - the other model assumption worth guarding
