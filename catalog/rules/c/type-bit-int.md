---
id: c-type-bit-int
lang: c
prefix: type
title: Use _BitInt for exact widths the fixed types do not cover
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [_BitInt, bit-precise, width, packed id]
  files: ["**/*.c", "**/*.h"]
  symbols: [_BitInt]
related: [c-type-intmax, c-conv-fixed-width]
sources:
  - title: cppreference - Arithmetic types (bit-precise integers)
    url: https://en.cppreference.com/w/c/language/arithmetic_types
---
> Declare `_BitInt(N)` when the value is exactly N bits; fixed-width types stop at 8, 16, 32, and 64.

## Why

Bit-precise integer types, listed among the arithmetic types, let a declaration state an exact width such as 24 bits for a packed identifier or 40 bits for a hardware register. The fixed-width types only cover the conventional widths, so code masks wider types down by hand and re-introduces the width as a magic constant. `_BitInt(N)` keeps the width in the type.

## Bad

```c
#include <stdint.h>

uint32_t packed_id(uint32_t id) {
    return id & 0xFFFFFFu;   /* only 24 bits are meaningful */
}
```

## Good

```c
_BitInt(24) packed_id(_BitInt(24) id) {
    return id;   /* exactly 24 bits, no masking */
}
```

## See Also

- [c-type-intmax](type-intmax.md) - the widest type when no exact width is known
- [c-conv-fixed-width](conv-fixed-width.md) - the conventional widths for wire formats
