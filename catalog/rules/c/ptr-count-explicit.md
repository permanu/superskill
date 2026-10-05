---
id: c-ptr-count-explicit
lang: c
prefix: ptr
title: Carry the element count with the pointer instead of recovering it with sizeof
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [array decay, sizeof, count, function parameter]
  files: ["**/*.c", "**/*.h"]
  symbols: [sizeof]
related: [c-ptr-bounds-arith, c-ptr-null-check]
sources:
  - title: SEI CERT C - ARR01-C, do not apply the sizeof operator to a pointer when taking the size of an array
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/arrays-arr/arr01-c/
  - title: Linux kernel coding style - Don't re-invent the kernel macros
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Pass the number of elements as an explicit parameter; an array parameter is a pointer and carries no length.

## Why

In a function parameter, an array declaration is adjusted to a pointer, so `sizeof(array)` yields the pointer size, not the array size. Code that computes the element count inside the callee therefore processes two elements on a 64-bit machine instead of the caller's array. The count is known where the array is declared; pass it and use an `ARRAY_SIZE`-style macro only at that site.

## Bad

```c
#include <stddef.h>

void clear(int *array) {
    size_t bytes = sizeof(array);   /* pointer size, not the caller's array */
    for (size_t i = 0; i < bytes / sizeof(array[0]); ++i) {
        array[i] = 0;
    }
}
```

## Good

```c
#include <stddef.h>

void clear(int *array, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        array[i] = 0;
    }
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - using the count to bound pointer arithmetic
- [c-ptr-null-check](ptr-null-check.md) - the other parameter check at the boundary
