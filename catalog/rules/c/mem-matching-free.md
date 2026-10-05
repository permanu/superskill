---
id: c-mem-matching-free
lang: c
prefix: mem
title: Pass free only a pointer returned by an allocation function, never an interior address
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [free, interior pointer, alignment, deallocation]
  files: ["**/*.c", "**/*.h"]
  symbols: [free, malloc, calloc, realloc, aligned_alloc]
related: [c-mem-single-owner, c-mem-use-after-free]
sources:
  - title: cppreference - free
    url: https://en.cppreference.com/w/c/memory/free
---
> Deallocate exactly the pointer the allocation function returned, never a pointer derived from it.

## Why

`free` requires a value equal to one returned earlier by the allocation family; any other value is undefined behavior. An interior pointer that points into the middle of a block corrupts the allocator's bookkeeping, and stack, static, or string-literal addresses are not heap blocks at all. Keep the base pointer intact and derive offsets only for reading and writing.

## Bad

```c
#include <stdlib.h>

struct buffer {
    char *data;
    size_t offset;
};

void release(struct buffer *b) {
    free(b->data + b->offset);   /* interior pointer: undefined behavior */
}
```

## Good

```c
#include <stdlib.h>

struct buffer {
    char *data;
    size_t offset;
};

void release(struct buffer *b) {
    free(b->data);               /* the exact pointer the allocator returned */
    b->data = NULL;
}
```

## See Also

- [c-mem-single-owner](mem-single-owner.md) - who holds the base pointer in the first place
- [c-mem-use-after-free](mem-use-after-free.md) - what ends when the base pointer is released
