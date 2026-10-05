---
id: c-mem-realloc-zero
lang: c
prefix: mem
title: Free instead of calling realloc with a zero size
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [realloc, zero size, free, resize]
  files: ["**/*.c", "**/*.h"]
  symbols: [realloc, free]
related: [c-err-alloc-failure, c-mem-zero-size]
sources:
  - title: cppreference - realloc
    url: https://en.cppreference.com/w/c/memory/realloc
---
> Route the zero-size case to free; never pass a zero byte count to realloc.

## Why

A zero-size `realloc` is undefined behavior in the current standard, and the old implementation-defined behavior already leaked or returned an unusable block on some libraries. The caller that wants zero bytes does not want a resized block at all: it wants the allocation gone. Branch on the size and free.

## Bad

```c
#include <stdlib.h>

void shrink_to_fit(char **buf, size_t used) {
    *buf = realloc(*buf, used);   /* used == 0 is undefined behavior */
}
```

## Good

```c
#include <stdlib.h>

void shrink_to_fit(char **buf, size_t used) {
    if (used == 0) {
        free(*buf);               /* zero bytes means release, not resize */
        *buf = NULL;
        return;
    }
    void *tmp = realloc(*buf, used);
    if (tmp != NULL) {
        *buf = tmp;
    }
}
```

## See Also

- [c-err-alloc-failure](err-alloc-failure.md) - preserving the old block when a nonzero resize fails
- [c-mem-zero-size](mem-zero-size.md) - the same degenerate size at allocation time
