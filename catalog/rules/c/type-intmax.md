---
id: c-type-intmax
lang: c
prefix: type
title: Use intmax_t and uintmax_t for the widest integer values
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [intmax_t, uintmax_t, widest, portability]
  files: ["**/*.c", "**/*.h"]
  symbols: [intmax_t, uintmax_t]
related: [c-type-bit-int, c-conv-fixed-width]
sources:
  - title: cppreference - Fixed width integer types
    url: https://en.cppreference.com/w/c/types/integer
---
> Reach for `intmax_t`/`uintmax_t` when a value must survive every integer width the implementation offers.

## Why

`intmax_t` and `uintmax_t` are defined as the widest signed and unsigned integer types, with the corresponding format macros for printing them. Accumulators, IDs, and hashes that outgrow `long` on some target and not on another are exactly this case. Using them states the requirement instead of picking the current machine's widest type.

## Bad

```c
unsigned long accumulate(unsigned long a, unsigned long b) {
    return a + b;   /* narrower than uintmax_t on some targets */
}
```

## Good

```c
#include <stdint.h>

uintmax_t accumulate(uintmax_t a, uintmax_t b) {
    return a + b;   /* the widest unsigned type the implementation offers */
}
```

## See Also

- [c-type-bit-int](type-bit-int.md) - exact widths the fixed types do not cover
- [c-conv-fixed-width](conv-fixed-width.md) - widths that must not vary in a format
