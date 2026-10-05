---
id: c-mem-clear-after-free
lang: c
prefix: mem
title: Store a new value in the owning pointer immediately after free
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dangling pointer, double free, "NULL", free]
  files: ["**/*.c", "**/*.h"]
  symbols: [free]
related: [c-mem-use-after-free, c-mem-single-owner]
sources:
  - title: SEI CERT C - MEM01-C, store a new value in pointers immediately after free()
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem01-c/
---
> Replace the owning pointer's value at the moment of release so no dangling copy can be freed or used again.

## Why

A pointer left holding a freed address invites a double free on the next cleanup path and a use-after-free on the next read. Assigning `NULL` or another valid object immediately after `free` makes the release visible: `free(NULL)` does nothing, so idempotent cleanup paths become safe without extra flags.

## Bad

```c
#include <stdlib.h>

char *message;
int message_type;

void handle(void) {
    if (message_type == 1) {
        free(message);
    }
    if (message_type == 2) {
        free(message);   /* same pointer freed a second time */
    }
}
```

## Good

```c
#include <stdlib.h>

char *message;
int message_type;

void handle(void) {
    if (message_type == 1) {
        free(message);
        message = NULL;   /* the owner forgets the block immediately */
    }
    if (message_type == 2) {
        free(message);    /* free(NULL) does nothing */
    }
}
```

## See Also

- [c-mem-use-after-free](mem-use-after-free.md) - why the stale value is dangerous
- [c-mem-single-owner](mem-single-owner.md) - where the owning pointer lives
