---
id: c-ptr-restrict-contract
lang: c
prefix: ptr
title: Apply restrict only where the caller guarantees non-overlapping access
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [restrict, aliasing, overlap, optimization]
  files: ["**/*.c", "**/*.h"]
  symbols: [restrict]
related: [c-ptr-strict-alias, c-mem-overlap-copy]
sources:
  - title: cppreference - restrict type qualifier
    url: https://en.cppreference.com/w/c/language/restrict
---
> Promise no aliasing with restrict only when every caller can honor it; otherwise leave the qualifier off.

## Why

`restrict` tells the compiler that accesses through the qualified pointer are not aliased during the block, which enables reordering and vectorization. If the caller passes the same buffer for two restrict-qualified parameters, the promise is broken and the optimized code can read stale or partially updated data. The qualifier belongs on APIs whose contract excludes overlap, not on routines that are expected to work in place.

## Bad

```c
#include <stddef.h>

void scale(int *restrict dst, const int *restrict src, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        dst[i] += src[i];
    }
}

void run(void) {
    int v[8] = {0};
    scale(v, v, 8);   /* dst and src alias: the restrict promise is broken */
}
```

## Good

```c
#include <stddef.h>

void scale(int *restrict dst, const int *restrict src, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        dst[i] = 2 * src[i];   /* caller guarantees dst and src are distinct */
    }
}

void scale_inplace(int *v, size_t n) {
    for (size_t i = 0; i < n; ++i) {
        v[i] *= 2;             /* aliasing is the point; no restrict */
    }
}
```

## See Also

- [c-ptr-strict-alias](ptr-strict-alias.md) - the type-based access rules that restrict reinforces
- [c-mem-overlap-copy](mem-overlap-copy.md) - overlapping ranges that need memmove, not promises
