---
id: c-conv-pointer-difference
lang: c
prefix: conv
title: Store pointer differences in ptrdiff_t
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ptrdiff_t, pointer difference, subtraction]
  files: ["**/*.c", "**/*.h"]
  symbols: [ptrdiff_t]
related: [c-conv-size-type, c-ptr-bounds-arith]
sources:
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/c/language/operator_arithmetic
---
> Keep the signed difference type from pointer subtraction; never narrow it to int.

## Why

Subtracting two pointers yields a signed value of type `ptrdiff_t`, which is the only type guaranteed to represent the distance between any two elements of an object. Storing it in `int` can truncate large distances and forces a conversion back when the value is used in indexing. Keep `ptrdiff_t` through the computation and convert once, deliberately, at the end.

## Bad

```c
#include <stddef.h>

int distance(const int *a, const int *b) {
    return a - b;   /* ptrdiff_t narrowed to int */
}
```

## Good

```c
#include <stddef.h>

ptrdiff_t distance(const int *a, const int *b) {
    return a - b;   /* the difference type is ptrdiff_t */
}
```

## See Also

- [c-conv-size-type](conv-size-type.md) - the unsigned counterpart for sizes
- [c-ptr-bounds-arith](ptr-bounds-arith.md) - keeping the pointers themselves in bounds
