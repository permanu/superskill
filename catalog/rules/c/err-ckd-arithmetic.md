---
id: c-err-ckd-arithmetic
lang: c
prefix: err
title: Compute sizes and offsets with checked integer arithmetic and act on the overflow flag
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overflow, size calculation, ckd_mul, allocation]
  files: ["**/*.c", "**/*.h"]
  symbols: [ckd_add, ckd_sub, ckd_mul]
related: [c-err-alloc-failure, c-err-status-return]
sources:
  - title: cppreference - Standard library header stdckdint.h
    url: https://en.cppreference.com/w/c/header/stdckdint
  - title: SEI CERT C - INT30-C, ensure that unsigned integer operations do not wrap
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int30-c/
---
> Compute allocation sizes and index arithmetic with the checked-arithmetic macros and fail when the overflow flag is set.

## Why

Unsigned arithmetic wraps silently, so a size multiplication can produce a small value that passes an allocation and is later used to write beyond the real end of the buffer. Manual precondition tests are easy to invert or to forget on one of several computed sizes. The checked-arithmetic macros compute into an output parameter and return nonzero on overflow, which turns wrap into a detectable error.

## Bad

```c
#include <stdint.h>
#include <stdlib.h>

int make_buffer(size_t count, uint16_t elem_size, void **out) {
    size_t bytes = count * elem_size;   /* wraps; allocation comes back short */
    *out = malloc(bytes);
    return *out == NULL ? -1 : 0;
}
```

## Good

```c
#include <stdckdint.h>
#include <stdint.h>
#include <stdlib.h>

int make_buffer(size_t count, uint16_t elem_size, void **out) {
    size_t bytes = 0;
    if (ckd_mul(&bytes, count, (size_t)elem_size)) {
        return -1;                      /* overflow: bytes is meaningless */
    }
    *out = malloc(bytes);
    return *out == NULL ? -1 : 0;
}
```

## See Also

- [c-err-alloc-failure](err-alloc-failure.md) - what to do with the size once it is proven to fit
- [c-err-status-return](err-status-return.md) - how the overflow failure reaches the caller
