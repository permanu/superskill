---
id: c-num-float-representation-compare
lang: c
prefix: num
title: Compare floating-point values with ==, never with object representations
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memcmp, float compare, negative zero, NaN]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcmp]
related: [c-unsafe-padding-compare, c-num-nan-compare]
sources:
  - title: SEI CERT C - FLP37-C, do not use object representations to compare floating-point values
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/floating-point-flp/flp37-c/
---
> Use the equality operators on floating-point values; bit patterns do not encode equivalence.

## Why

The object representation of floating-point values is implementation-defined, and value equivalence is not bit equivalence: `-0.0` and `0.0` compare equal but have different patterns, while two identical NaN patterns compare unequal. A `memcmp` over a struct containing a float therefore reports equality and inequality wrongly in both directions. Compare the values, or the members one by one.

## Bad

```c
#include <string.h>

struct sample {
    int id;
    double value;
};

int same(const struct sample *a, const struct sample *b) {
    return memcmp(a, b, sizeof *a) == 0;   /* -0.0 vs 0.0 differ in bytes */
}
```

## Good

```c
struct sample {
    int id;
    double value;
};

int same(const struct sample *a, const struct sample *b) {
    return a->id == b->id && a->value == b->value;   /* compare values */
}
```

## See Also

- [c-unsafe-padding-compare](unsafe-padding-compare.md) - the padding half of the same mistake
- [c-num-nan-compare](num-nan-compare.md) - where even value comparison surprises
