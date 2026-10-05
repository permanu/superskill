---
id: c-mem-use-after-free
lang: c
prefix: mem
title: Do not access a block after free; end its lifetime after the last use
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [use after free, dangling, lifetime, free]
  files: ["**/*.c", "**/*.h"]
  symbols: [free, malloc]
related: [c-mem-clear-after-free, c-mem-single-owner, c-mem-no-dangling-return]
sources:
  - title: cppreference - free
    url: https://en.cppreference.com/w/c/memory/free
---
> Release a block only after its last use, and never read or write through any pointer to it afterwards.

## Why

After `free` returns, any access through the old pointer is undefined behavior, and the allocator may have already handed the storage to another object. Reading the block can expose unrelated data, and writing it silently corrupts whatever now lives there. Structuring code so release follows the last use, not merely an early return, removes the whole class.

## Bad

```c
#include <stdlib.h>
#include <string.h>

char *duplicate(const char *src, size_t n) {
    char *tmp = malloc(n);
    if (tmp == NULL) {
        return NULL;
    }
    memcpy(tmp, src, n);
    free(tmp);               /* released before the caller is done */
    return tmp;              /* dangling pointer */
}
```

## Good

```c
#include <stdlib.h>
#include <string.h>

char *duplicate(const char *src, size_t n) {
    char *tmp = malloc(n);
    if (tmp == NULL) {
        return NULL;
    }
    memcpy(tmp, src, n);
    return tmp;              /* the owner frees it after the last use */
}
```

## See Also

- [c-mem-clear-after-free](mem-clear-after-free.md) - what to do with pointers that survive the release
- [c-mem-single-owner](mem-single-owner.md) - making the last use obvious
- [c-mem-no-dangling-return](mem-no-dangling-return.md) - the automatic-storage version of the same mistake
