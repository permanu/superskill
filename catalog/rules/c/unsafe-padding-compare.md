---
id: c-unsafe-padding-compare
lang: c
prefix: unsafe
title: Compare struct fields, not the bytes that include padding
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [padding, memcmp, struct compare, indeterminate]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcmp]
related: [c-unsafe-union-active, c-mem-zero-init]
sources:
  - title: SEI CERT C - EXP42-C, do not compare padding data
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp42-c/
---
> Compare each member; `memcmp` over a struct reads padding whose bytes are indeterminate.

## Why

Structures contain unnamed padding between and after members, and those bytes keep indeterminate values except for static storage initialized to zero. Two logically equal objects can differ in padding, so a byte-wise comparison reports inequality, and hashing or transmitting the struct leaks or varies with the padding. Compare fields explicitly, or serialize into a defined byte layout first.

## Bad

```c
#include <string.h>

struct record {
    char code;
    int value;
};

int same(const struct record *a, const struct record *b) {
    return memcmp(a, b, sizeof *a) == 0;   /* padding bytes are indeterminate */
}
```

## Good

```c
struct record {
    char code;
    int value;
};

int same(const struct record *a, const struct record *b) {
    return a->code == b->code && a->value == b->value;   /* compare fields */
}
```

## See Also

- [c-unsafe-union-active](unsafe-union-active.md) - another byte-level reinterpretation hazard
- [c-mem-zero-init](mem-zero-init.md) - giving every byte a defined value before use
