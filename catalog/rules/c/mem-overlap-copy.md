---
id: c-mem-overlap-copy
lang: c
prefix: mem
title: Use memmove when source and destination ranges can overlap
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcpy, memmove, overlap, buffer]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy, memmove]
related: [c-mem-use-after-free]
sources:
  - title: cppreference - memcpy
    url: https://en.cppreference.com/w/c/string/byte/memcpy
---
> Copy with memmove whenever the two ranges may share bytes; memcpy requires disjoint objects.

## Why

`memcpy` declares its pointer arguments `restrict` and its behavior is undefined when the objects overlap, which compilers rely on to vectorize the copy. In-place shifting, compaction, and insert-into-array code routinely overlaps, so the safe default for possibly-overlapping copies is `memmove`, which is defined to behave as if it copied through a temporary buffer.

## Bad

```c
#include <string.h>

void shift_left(char *buf, size_t len, size_t amount) {
    memcpy(buf, buf + amount, len - amount);   /* ranges overlap */
}
```

## Good

```c
#include <string.h>

void shift_left(char *buf, size_t len, size_t amount) {
    memmove(buf, buf + amount, len - amount);  /* overlap is allowed */
}
```

## See Also

- [c-mem-use-after-free](mem-use-after-free.md) - another case of touching storage the compiler assumes is stable
