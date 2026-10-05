---
id: c-mem-aligned-alloc
lang: c
prefix: mem
title: Pass aligned_alloc a size that is a multiple of the alignment
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [aligned_alloc, alignment, allocation, over-aligned]
  files: ["**/*.c", "**/*.h"]
  symbols: [aligned_alloc, free]
related: [c-mem-sizeof-object, c-err-ckd-arithmetic]
sources:
  - title: cppreference - aligned_alloc
    url: https://en.cppreference.com/w/c/memory/aligned_alloc
---
> Give aligned_alloc a size that is an integral multiple of the alignment, and release it with free.

## Why

`aligned_alloc` requires the size to be a multiple of the alignment; when the precondition is violated the call fails instead of returning storage, so a later null check turns into a mysterious allocation failure. Rounding the byte count up to the next multiple keeps the over-aligned contract satisfied, and the overflow check rejects sizes that cannot be rounded. The block is an ordinary allocation and must be released with `free`, not a platform-specific deallocator.

## Bad

```c
#include <stdlib.h>

int *make_aligned(size_t count) {
    /* size is not necessarily a multiple of the alignment */
    return aligned_alloc(64, count * sizeof(int));
}
```

## Good

```c
#include <stdlib.h>

int *make_aligned(size_t count) {
    size_t bytes = count * sizeof(int);
    size_t rounded = bytes % 64 == 0 ? bytes : bytes + (64 - bytes % 64);
    if (rounded == 0 || rounded < bytes) {
        return NULL;                     /* empty input or rounding overflow */
    }
    return aligned_alloc(64, rounded);   /* released with free() */
}
```

## See Also

- [c-mem-sizeof-object](mem-sizeof-object.md) - computing the byte count to round
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - checking the size multiplication before rounding
