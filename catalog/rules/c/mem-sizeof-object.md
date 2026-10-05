---
id: c-mem-sizeof-object
lang: c
prefix: mem
title: Size each allocation with sizeof on the object expression it will store
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sizeof, malloc, allocation size, layout]
  files: ["**/*.c", "**/*.h"]
  symbols: [malloc, calloc, sizeof]
related: [c-mem-no-cast-malloc, c-mem-flex-array]
sources:
  - title: Linux kernel coding style - Allocating memory
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
  - title: cppreference - malloc
    url: https://en.cppreference.com/w/c/memory/malloc
---
> Derive allocation size from the object being stored with `sizeof *p`, not from a repeated type name or literal byte count.

## Why

Spelling the type or the layout again creates a second source of truth that stops matching when the declaration changes, producing an undersized allocation that overflows on first use. `sizeof *p` tracks the pointer's own type automatically, and `sizeof(type)` for arrays keeps the element type in one place. The compiler then cannot drift from the code.

## Bad

```c
#include <stdlib.h>

struct point {
    double x;
    double y;
};

struct point *make_point(void) {
    return malloc(2 * sizeof(double));   /* repeats the layout */
}
```

## Good

```c
#include <stdlib.h>

struct point {
    double x;
    double y;
};

struct point *make_point(void) {
    struct point *p = malloc(sizeof *p);   /* size derives from the object */
    return p;
}
```

## See Also

- [c-mem-no-cast-malloc](mem-no-cast-malloc.md) - the other half of the allocation call
- [c-mem-flex-array](mem-flex-array.md) - sizing an allocation that is not a single object
