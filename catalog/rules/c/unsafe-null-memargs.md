---
id: c-unsafe-null-memargs
lang: c
prefix: unsafe
title: Do not pass null pointers to memcpy or memset, even for zero bytes
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcpy, memset, null pointer, zero length]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy, memmove, memset]
related: [c-unsafe-copy-bounds, c-ptr-null-check]
sources:
  - title: cppreference - memcpy
    url: https://en.cppreference.com/w/c/string/byte/memcpy
---
> Skip the copy when the length is zero; never call a byte function with a null argument.

## Why

The behavior of `memcpy` and `memset` is undefined if a pointer argument is null or invalid, and that applies even when the byte count is zero. Code that treats a zero length as a license to pass null pointers relies on an assumption the standard does not grant, and sanitizers and optimizers increasingly expose it. Branch on the length before the call.

## Bad

```c
#include <string.h>

void append(char *dst, const char *src, size_t n) {
    if (n == 0) {
        src = NULL;        /* "nothing to copy" */
    }
    memcpy(dst, src, n);   /* null is undefined even with zero length */
}
```

## Good

```c
#include <string.h>

void append(char *dst, const char *src, size_t n) {
    if (n == 0) {
        return;            /* skip the call; do not pass null */
    }
    memcpy(dst, src, n);
}
```

## See Also

- [c-unsafe-copy-bounds](unsafe-copy-bounds.md) - the other precondition of the same call
- [c-ptr-null-check](ptr-null-check.md) - validating pointers at the boundary
