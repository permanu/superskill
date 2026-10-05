---
id: c-conv-endian-explicit
lang: c
prefix: conv
title: Serialize multibyte integers byte by byte, never as memory dumps
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [endianness, serialization, byte order, wire format]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-fixed-width, c-unsafe-padding-compare]
sources:
  - title: cppreference - Objects and alignment
    url: https://en.cppreference.com/w/c/language/object
---
> Build wire values with explicit shifts and masks; copying host memory leaks the platform's byte order.

## Why

Multibyte integer layout is implementation-defined: big-endian stores the most significant byte first, little-endian the least significant. A struct or integer copied to a file or socket therefore changes meaning across platforms, and the receiving side reads a different number. Emit each byte explicitly so the format is defined by the code, not by the machine.

## Bad

```c
#include <stdint.h>
#include <string.h>

void store_u32(void *dst, uint32_t v) {
    memcpy(dst, &v, sizeof v);   /* host byte order becomes the wire format */
}
```

## Good

```c
#include <stdint.h>

void store_u32(unsigned char *dst, uint32_t v) {
    dst[0] = (unsigned char)(v >> 24);   /* big-endian, defined byte order */
    dst[1] = (unsigned char)(v >> 16);
    dst[2] = (unsigned char)(v >> 8);
    dst[3] = (unsigned char)v;
}
```

## See Also

- [c-conv-fixed-width](conv-fixed-width.md) - widths that make the byte order unambiguous
- [c-unsafe-padding-compare](unsafe-padding-compare.md) - other byte-level struct hazards
