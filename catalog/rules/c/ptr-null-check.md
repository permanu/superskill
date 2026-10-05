---
id: c-ptr-null-check
lang: c
prefix: ptr
title: Validate pointer arguments for null before dereferencing them
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [null pointer, dereference, validation, arguments]
  files: ["**/*.c", "**/*.h"]
  symbols: ["NULL", nullptr]
related: [c-ptr-count-explicit, c-ptr-bounds-arith, c-mem-no-cast-malloc]
sources:
  - title: SEI CERT C - EXP34-C, do not dereference null pointers
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp34-c/
---
> Reject a null pointer at the function boundary; never let a dereference decide.

## Why

Dereferencing a null pointer is undefined behavior, and on targets where address zero is mapped it can be exploited rather than crash. Functions that receive pointers from callers cannot assume non-null, and allocation and lookup failures make null a normal outcome. Checking once at the boundary converts an unpredictable fault into an ordinary error return.

## Bad

```c
#include <string.h>

void store_name(char *dst, const char *src) {
    strcpy(dst, src);   /* dst or src may be NULL */
}
```

## Good

```c
#include <string.h>

int store_name(char *dst, size_t cap, const char *src) {
    if (dst == NULL || src == NULL || cap == 0) {
        return -1;
    }
    if (strlen(src) >= cap) {
        return -1;
    }
    strcpy(dst, src);
    return 0;
}
```

## See Also

- [c-ptr-count-explicit](ptr-count-explicit.md) - the length that makes the destination check possible
- [c-ptr-bounds-arith](ptr-bounds-arith.md) - validating indices before forming pointers
- [c-mem-no-cast-malloc](mem-no-cast-malloc.md) - the allocation result that can be null
