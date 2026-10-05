---
id: c-pat-refcount
lang: c
prefix: pat
title: Reference-count shared objects with explicit get and put
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reference counting, refcount, sharing, lifetime]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-mem-single-owner, c-pat-init-destroy]
sources:
  - title: Linux kernel coding style - Data structures
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Keep a count in the object, take a reference on every share, and free when the last one is put.

## Why

Kernel style requires reference counts on data structures visible outside the scope that created them, because any other thread may still hold a pointer when one user is done. Without a count, the first user to finish frees the object while the others still read it. A get/put pair makes ownership explicit and gives the last owner exactly one release point.

## Bad

```c
#include <stdlib.h>

struct buffer {
    char *data;
};

struct buffer *shared;

void drop_buffer(struct buffer *b) {
    free(b->data);
    free(b);   /* the first user frees while others still hold it */
}
```

## Good

```c
#include <stdlib.h>

struct buffer {
    char *data;
    int refs;
};

void buffer_get(struct buffer *b) {
    ++b->refs;   /* every owner takes a reference */
}

void buffer_put(struct buffer *b) {
    if (--b->refs == 0) {
        free(b->data);   /* the last owner frees */
        free(b);
    }
}
```

## See Also

- [c-mem-single-owner](mem-single-owner.md) - ownership when the object is not shared
- [c-pat-init-destroy](pat-init-destroy.md) - the module lifecycle around such objects
