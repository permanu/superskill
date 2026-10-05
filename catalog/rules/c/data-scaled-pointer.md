---
id: c-data-scaled-pointer
lang: c
prefix: data
title: Never add a byte count to a non-character pointer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer arithmetic, sizeof, scaling, offset]
  files: ["**/*.c", "**/*.h"]
  symbols: [sizeof, offsetof]
related: [c-ptr-bounds-arith, c-data-pointer-iteration]
sources:
  - title: SEI CERT C - ARR39-C, do not add or subtract a scaled integer to a pointer
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/arrays-arr/arr39-c/
---
> Add element counts to typed pointers; `sizeof` and `offsetof` results are byte counts that must not be scaled again.

## Why

CERT states that pointer arithmetic scales the integer by the size of the pointed-to type, so adding a `sizeof` result to an `int *` multiplies by `sizeof(int)` a second time and forms a pointer outside the array. The result is undefined even before it is dereferenced. Add the number of elements, or cast to `unsigned char *` first when bytes are genuinely what is meant.

## Bad

```c
int *end_of(int *buf) {
    return buf + sizeof(buf);   /* sizeof is bytes; the add scales again */
}
```

## Good

```c
#include <stddef.h>

int *end_of(int *buf, size_t n) {
    return buf + n;   /* n counts elements; pointer math scales it once */
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - staying inside the array
- [c-data-pointer-iteration](data-pointer-iteration.md) - using the resulting bounds
