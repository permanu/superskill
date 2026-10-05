---
id: c-conv-checked-narrow
lang: c
prefix: conv
title: Check the destination range before every narrowing integer conversion
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [narrowing, truncation, range check, conversion]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-size-type, c-conv-mixed-signs]
sources:
  - title: SEI CERT C - INT31-C, ensure that integer conversions do not result in lost or misinterpreted data
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int31-c/
---
> Compare against the destination limits before converting to a narrower integer type.

## Why

Converting to a narrower type keeps only the low-order bits, so a large value silently becomes a small one, and converting an unsigned value to a signed type that cannot represent it is implementation-defined. Both failure modes feed wrong sizes and indices into memory operations. The only safe conversions without a check widen to a type of the same signedness; everything else needs an explicit range test.

## Bad

```c
#include <stddef.h>

int length_as_int(size_t n) {
    return n;   /* truncates values above INT_MAX */
}
```

## Good

```c
#include <limits.h>
#include <stddef.h>

int length_as_int(size_t n, int *out) {
    if (n > (size_t)INT_MAX) {
        return -1;              /* reject values that cannot be represented */
    }
    *out = (int)n;
    return 0;
}
```

## See Also

- [c-conv-size-type](conv-size-type.md) - choosing the right width in the first place
- [c-conv-mixed-signs](conv-mixed-signs.md) - the sign half of the same hazard
