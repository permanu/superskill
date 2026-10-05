---
id: c-ffi-offset-width
lang: c
prefix: ffi
title: Do not share raw off_t across builds; use a fixed-width offset
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [off_t, FILE_OFFSET_BITS, file offset, width]
  files: ["**/*.h"]
  symbols: [off_t]
related: [c-ffi-time-format, c-conv-fixed-width]
sources:
  - title: Linux man-pages - feature_test_macros(7)
    url: https://man7.org/linux/man-pages/man7/feature_test_macros.7.html
---
> Put a fixed-width offset in shared structures; convert to off_t at the syscall boundary.

## Why

The feature-test macro documentation shows `_FILE_OFFSET_BITS` controlling whether file offsets use a 32-bit or 64-bit type, so the width of `off_t` depends on how each translation unit is compiled. A structure shared between components built with different settings then has different field sizes and layouts. A fixed-width offset keeps the format one size everywhere, with the conversion local to the calls that need `off_t`.

## Bad

```c
#include <sys/types.h>

struct chunk {
    off_t offset;   /* width follows _FILE_OFFSET_BITS */
};
```

## Good

```c
#include <stdint.h>

struct chunk {
    int64_t offset;   /* one width on every build */
};
```

## See Also

- [c-ffi-time-format](ffi-time-format.md) - the same discipline for timestamps
- [c-conv-fixed-width](conv-fixed-width.md) - fixed-width types in shared structures
