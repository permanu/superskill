---
id: c-conv-fixed-width
lang: c
prefix: conv
title: Use fixed-width integer types in wire formats and binary structures
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [int32_t, stdint, wire format, ABI, struct layout]
  files: ["**/*.c", "**/*.h"]
  symbols: [int32_t, uint64_t, int16_t]
related: [c-conv-printf-length, c-conv-enum-underlying]
sources:
  - title: cppreference - Fixed width integer types
    url: https://en.cppreference.com/w/c/types/integer
---
> Declare binary structures with `intN_t`/`uintN_t` so the width does not change with the platform.

## Why

`int`, `long`, and `long long` have different widths on different targets, so a struct that uses them changes layout and size between builds, corrupting anything that reads it as a format. The fixed-width types state the width in the name and keep offsets stable. Use them wherever the bytes are shared: files, network packets, and shared memory.

## Bad

```c
struct header {
    long length;   /* width varies by platform */
    int kind;
};
```

## Good

```c
#include <stdint.h>

struct header {
    int64_t length;   /* fixed width in a wire structure */
    int32_t kind;
};
```

## See Also

- [c-conv-printf-length](conv-printf-length.md) - printing these types correctly
- [c-conv-enum-underlying](conv-enum-underlying.md) - the same discipline for enums
