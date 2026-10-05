---
id: c-conv-promotion
lang: c
prefix: conv
title: Account for integer promotion, small types compute as int
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [integer promotion, small types, wrap, int]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-bitwise-unsigned, c-conv-mixed-signs]
sources:
  - title: cppreference - Implicit conversions
    url: https://en.cppreference.com/w/c/language/conversion
  - title: SEI CERT C - INT02-C, understand integer conversion rules
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/integers-int/int02-c/
---
> Remember that types smaller than int are promoted before arithmetic; truncate back to the target width explicitly.

## Why

Operands of `char`, `short`, and `uint8_t` are promoted to `int` before any arithmetic, so intermediate results are computed at `int` width and wrap at 8 or 16 bits only when converted back. Code that expects the small type's wraparound during the computation gets a different answer, and code that converts back without thinking loses the distinction. Convert deliberately to the width the value is meant to have.

## Bad

```c
#include <stdint.h>

int wraps_to_zero(uint8_t a, uint8_t b) {
    return a + b == 0;   /* int promotion means no 8-bit wrap */
}
```

## Good

```c
#include <stdint.h>

int wraps_to_zero(uint8_t a, uint8_t b) {
    uint8_t sum = (uint8_t)(a + b);   /* truncate to the target width */
    return sum == 0;
}
```

## See Also

- [c-conv-bitwise-unsigned](conv-bitwise-unsigned.md) - promotion at the shift operators
- [c-conv-mixed-signs](conv-mixed-signs.md) - the other conversion applied to operands
