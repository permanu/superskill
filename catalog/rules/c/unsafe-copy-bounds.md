---
id: c-unsafe-copy-bounds
lang: c
prefix: unsafe
title: Never copy more bytes than the destination can hold
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcpy, buffer overflow, capacity, bounds]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy, memmove, memset]
related: [c-unsafe-null-memargs, c-ptr-count-explicit]
sources:
  - title: cppreference - memcpy
    url: https://en.cppreference.com/w/c/string/byte/memcpy
---
> Bound every copy by the destination capacity, not by the source's claimed length.

## Why

The behavior of `memcpy` is undefined if the copy reaches beyond the destination array, and the size argument is the only thing standing between a length field and a heap overflow. Lengths that travel with the data describe the source, not the room available at the destination. Validate the requested length against the capacity before copying.

## Bad

```c
#include <string.h>

void store(char *dst, size_t cap, const char *src, size_t src_len) {
    memcpy(dst, src, src_len);   /* src_len may exceed cap */
}
```

## Good

```c
#include <string.h>

int store(char *dst, size_t cap, const char *src, size_t src_len) {
    if (src_len > cap) {
        return -1;
    }
    memcpy(dst, src, src_len);
    return 0;
}
```

## See Also

- [c-unsafe-null-memargs](unsafe-null-memargs.md) - the pointer precondition of the same call
- [c-ptr-count-explicit](ptr-count-explicit.md) - carrying the destination capacity explicitly
