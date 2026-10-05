---
id: c-ptr-bounds-arith
lang: c
prefix: ptr
title: Keep pointer arithmetic inside one array object; one past the end may be formed but not dereferenced
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer arithmetic, bounds, out of bounds, subscript]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-count-explicit, c-ptr-null-check]
sources:
  - title: SEI CERT C - ARR30-C, do not form or use out-of-bounds pointers or array subscripts
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/arrays-arr/arr30-c/
---
> Validate an index before using it in pointer arithmetic; a pointer may only point into its array or one past the end.

## Why

Pointer addition is defined only within the array the pointer refers to, plus one past the end; any other result is undefined even if it is never dereferenced. A negative or oversized index can therefore trap during the arithmetic itself, or produce an address that reads a neighboring object. Bounds checks must reject both ends before the pointer is formed.

## Bad

```c
#include <stddef.h>

enum { TABLESIZE = 100 };
static int table[TABLESIZE];

int *slot(int index) {
    if (index < TABLESIZE) {
        return table + index;   /* negative index forms an invalid pointer */
    }
    return NULL;
}
```

## Good

```c
#include <stddef.h>

enum { TABLESIZE = 100 };
static int table[TABLESIZE];

int *slot(int index) {
    if (index >= 0 && index < TABLESIZE) {
        return table + index;
    }
    return NULL;
}
```

## See Also

- [c-ptr-count-explicit](ptr-count-explicit.md) - the count that bounds the arithmetic
- [c-ptr-null-check](ptr-null-check.md) - what callers must do with the null result
