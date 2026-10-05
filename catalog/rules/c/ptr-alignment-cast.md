---
id: c-ptr-alignment-cast
lang: c
prefix: ptr
title: Do not cast to a pointer type with stricter alignment than the original
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alignment, cast, misaligned, undefined behavior]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-bounds-arith, c-ptr-strict-alias]
sources:
  - title: SEI CERT C - EXP36-C, do not cast pointers into more strictly aligned pointer types
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp36-c/
---
> Convert a pointer only to a type whose alignment requirement the original storage already satisfies.

## Why

If the converted pointer is not correctly aligned for the target type, the conversion itself is undefined behavior and dereferencing it can trap or silently drop address bits. A `char` object is aligned for one byte, so casting its address to `int *` produces a pointer the platform may not be able to load. Copy the value into a properly aligned object instead.

## Bad

```c
int misaligned(void) {
    char c = 'x';
    int *ip = (int *)&c;   /* &c is not aligned for int */
    return *ip;            /* undefined behavior */
}
```

## Good

```c
int aligned(void) {
    char c = 'x';
    int i = c;             /* copy into a properly aligned object */
    int *ip = &i;
    return *ip;
}
```

## See Also

- [c-ptr-bounds-arith](ptr-bounds-arith.md) - the other pointer-value precondition
- [c-ptr-strict-alias](ptr-strict-alias.md) - the type-based access precondition
