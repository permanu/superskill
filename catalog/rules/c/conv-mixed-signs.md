---
id: c-conv-mixed-signs
lang: c
prefix: conv
title: Keep signed and unsigned values in separate domains and test the sign before mixing
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signed, unsigned, usual arithmetic conversions, negative]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-unsigned-underflow, c-conv-checked-narrow]
sources:
  - title: SEI CERT C - INT02-C, understand integer conversion rules
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/integers-int/int02-c/
  - title: cppreference - Implicit conversions
    url: https://en.cppreference.com/w/c/language/conversion
---
> Test signed values before they meet unsigned ones; the usual arithmetic conversions move the negative range into huge values.

## Why

When a signed and an unsigned operand share an expression, the signed operand is converted to the unsigned type whenever its rank does not fit, so -1 becomes the largest value of that type. Comparisons invert, ternary results pick unexpected types, and differences become huge sizes. Keep the domains apart and convert only after checking the sign.

## Bad

```c
#include <stddef.h>

size_t pick(size_t limit, int fallback) {
    return limit != 0 ? limit : fallback;   /* fallback converts to size_t */
}
```

## Good

```c
#include <stddef.h>

size_t pick(size_t limit, int fallback) {
    if (limit != 0) {
        return limit;
    }
    if (fallback < 0) {
        return 0;   /* reject negative values before conversion */
    }
    return (size_t)fallback;
}
```

## See Also

- [c-conv-unsigned-underflow](conv-unsigned-underflow.md) - the same wrap on unsigned subtraction
- [c-conv-checked-narrow](conv-checked-narrow.md) - explicit conversions with range tests
