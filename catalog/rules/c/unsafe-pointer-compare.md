---
id: c-unsafe-pointer-compare
lang: c
prefix: unsafe
title: Compare pointers only within the same array object
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer comparison, ordering, array, unspecified]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-bounds-arith, c-unsafe-null-arith]
sources:
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
---
> Order pointers with `<` or `>` only when both point into one array; use indices for anything else.

## Why

Ordering comparisons are defined for pointers into the same array (and for members of the same struct in declaration order), not for unrelated objects; comparing addresses of different allocations is undefined and can produce inconsistent results across runs. Equality comparison stays portable. When order matters between separate objects, compare indices or identifiers instead of addresses.

## Bad

```c
#include <stddef.h>

int earlier(const int *a, const int *b) {
    return a < b;   /* different arrays: comparison is undefined */
}
```

## Good

```c
#include <stddef.h>

int earlier(const int *base, size_t i, size_t j) {
    return base + i < base + j;   /* both point into the same array */
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - forming the pointers that may be compared
- [c-unsafe-null-arith](unsafe-null-arith.md) - the array requirement for pointer arithmetic
