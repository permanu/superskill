---
id: c-data-array-bounds-library
lang: c
prefix: data
title: Keep every pointer and size pair passed to a library function valid
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [library bounds, pointer size pair, valid range, memcpy]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy, memmove, memset]
related: [c-unsafe-copy-bounds, c-ptr-bounds-arith]
sources:
  - title: SEI CERT C - ARR38-C, guarantee that library functions do not form invalid pointers
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/arrays-arr/arr38-c/
---
> Validate the pair, not just the count: the pointer plus the size must stay inside one object.

## Why

CERT explains that library functions taking a pointer and an element count may compute addresses beyond the object, and that the standard makes such calls undefined even when no access happens. An offset added to a base pointer is where this bites: each part may look checked while their sum is not. Test the offset and the remaining capacity together before the call.

## Bad

```c
#include <string.h>

void copy_at(char *dst, size_t cap, size_t offset, const char *src, size_t n) {
    memcpy(dst + offset, src, n);   /* offset + n may exceed cap */
}
```

## Good

```c
#include <string.h>

int copy_at(char *dst, size_t cap, size_t offset, const char *src, size_t n) {
    if (offset > cap || n > cap - offset) {
        return -1;   /* keep every pointer+size argument a valid range */
    }
    memcpy(dst + offset, src, n);
    return 0;
}
```

## See Also

- [c-unsafe-copy-bounds](unsafe-copy-bounds.md) - bounding the copy itself
- [c-ptr-bounds-arith](ptr-bounds-arith.md) - keeping the formed pointer in bounds
