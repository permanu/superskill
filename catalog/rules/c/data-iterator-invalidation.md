---
id: c-data-iterator-invalidation
lang: c
prefix: data
title: Reacquire pointers into an array after it grows
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [realloc, invalidation, iterator, pointer]
  files: ["**/*.c", "**/*.h"]
  symbols: [realloc]
related: [c-pat-dynarray, c-mem-use-after-free]
sources:
  - title: cppreference - realloc
    url: https://en.cppreference.com/w/c/memory/realloc
---
> Growth may move the block; any pointer or iterator into the old storage is invalid afterwards.

## Why

cppreference states that on success the original pointer is invalidated and that accessing it is undefined behavior, even when the reallocation happened in place. Code that cached an element pointer before growing, or kept a loop cursor across the call, then writes through a dangling pointer. Compute indices, or reacquire pointers after the resize.

## Bad

```c
#include <stdlib.h>

int grow_and_write(int **items, size_t n) {
    int *first = *items;               /* pointer into the old block */
    *items = realloc(*items, (n + 1) * sizeof **items);
    if (*items == NULL) {
        return -1;
    }
    first[0] = 1;   /* first may point at freed memory */
    return 0;
}
```

## Good

```c
#include <stdlib.h>

int grow_and_write(int **items, size_t n) {
    void *grown = realloc(*items, (n + 1) * sizeof **items);
    if (grown == NULL) {
        return -1;
    }
    *items = grown;
    (*items)[0] = 1;   /* pointers into the array are reacquired after growth */
    return 0;
}
```

## See Also

- [c-pat-dynarray](pat-dynarray.md) - the container that hides the reacquisition
- [c-mem-use-after-free](mem-use-after-free.md) - the lifetime rule behind this
