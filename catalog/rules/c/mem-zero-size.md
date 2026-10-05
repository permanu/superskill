---
id: c-mem-zero-size
lang: c
prefix: mem
title: Handle empty input explicitly instead of requesting a zero-length allocation
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [zero length, malloc, empty, implementation-defined]
  files: ["**/*.c", "**/*.h"]
  symbols: [malloc, calloc, realloc]
related: [c-mem-realloc-zero, c-mem-flex-array]
sources:
  - title: SEI CERT C - MEM04-C, beware of zero-length allocations
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem04-c/
---
> Reject or special-case empty input before any allocation call sees a zero size.

## Why

Zero-size allocation behavior is implementation-defined: the call may return null or a unique pointer to storage that must not be dereferenced. Code that treats a non-null result as a usable buffer then writes past a zero-length block. Deciding what empty input means in the domain, before calling the allocator, keeps that ambiguity out of the data path.

## Bad

```c
#include <stdlib.h>

int *alloc_list(size_t n) {
    int *list = malloc(n * sizeof(int));   /* n == 0: implementation-defined */
    return list;
}
```

## Good

```c
#include <stdlib.h>

int *alloc_list(size_t n) {
    if (n == 0) {
        return NULL;                       /* empty input is a caller decision */
    }
    return malloc(n * sizeof(int));
}
```

## See Also

- [c-mem-realloc-zero](mem-realloc-zero.md) - the resize-time version of the same check
- [c-mem-flex-array](mem-flex-array.md) - sizing an allocation whose count can be zero
