---
id: c-ffi-packed-struct
lang: c
prefix: ffi
title: Do not use packed structs as shared formats
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [packed, alignment, wire format, struct]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-endian-explicit, c-ffi-versioned-struct]
sources:
  - title: GCC - Common Attributes (packed)
    url: https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes
---
> Keep shared structs naturally aligned and serialize byte by byte when the format demands it.

## Why

The `packed` attribute gives members the smallest possible alignment, so a packed struct containing wider fields produces unaligned accesses that trap on strict-alignment targets and perform poorly elsewhere. The format also stays compiler-specific. Natural alignment plus explicit byte-wise serialization gives one defined layout everywhere and no alignment hazard.

## Bad

```c
struct __attribute__((packed)) header {
    unsigned char tag;
    unsigned int length;   /* unaligned access on strict-alignment targets */
};
```

## Good

```c
#include <stdint.h>

struct header {
    uint8_t tag;
    uint32_t length;   /* naturally aligned; serialize byte by byte if needed */
};
```

## See Also

- [c-conv-endian-explicit](conv-endian-explicit.md) - producing the bytes of the format
- [c-ffi-versioned-struct](ffi-versioned-struct.md) - evolving the struct without breaking readers
