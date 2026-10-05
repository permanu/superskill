---
id: c-unsafe-union-active
lang: c
prefix: unsafe
title: Pun types with memcpy, not by reading an inactive union member
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [union, type punning, active member, memcpy]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy]
related: [c-unsafe-padding-compare, c-unsafe-bitfield-layout]
sources:
  - title: cppreference - union declaration
    url: https://en.cppreference.com/w/c/language/union
---
> Read only the union member that was last written; reinterpret values through `memcpy` instead.

## Why

Reading a union member other than the one last written reinterprets the stored object representation as the new type. The standard defines that reinterpretation, but the resulting value depends on byte order, padding, and the new type's representation; when the new type is larger, the excess bytes are unspecified and can be a trap representation. `memcpy` between correctly typed objects performs the same reinterpretation explicitly and does not depend on the union's layout.

## Bad

```c
union word {
    unsigned u;
    float f;
};

float as_float(unsigned u) {
    union word w;
    w.u = u;
    return w.f;   /* reading an inactive member reinterprets the bytes */
}
```

## Good

```c
#include <string.h>

float as_float(unsigned u) {
    float f = 0.0f;
    memcpy(&f, &u, sizeof f);   /* bytes reinterpreted explicitly */
    return f;
}
```

## See Also

- [c-unsafe-padding-compare](unsafe-padding-compare.md) - the other byte-level struct hazard
- [c-unsafe-bitfield-layout](unsafe-bitfield-layout.md) - layout assumptions that punning depends on
