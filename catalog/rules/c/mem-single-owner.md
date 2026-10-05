---
id: c-mem-single-owner
lang: c
prefix: mem
title: Give every allocation a single owning pointer released at the same level of abstraction that allocated it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ownership, malloc, free, module, abstraction]
  files: ["**/*.c", "**/*.h"]
  symbols: [malloc, calloc, realloc, free]
related: [c-mem-matching-free, c-mem-use-after-free, c-mem-clear-after-free]
sources:
  - title: SEI CERT C - MEM00-C, allocate and free memory in the same module, at the same level of abstraction
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem00-c/
---
> Keep allocation and release at one level of abstraction, with a single owner responsible for every block.

## Why

When one module allocates a block and another frees it, ownership is ambiguous and every new error path becomes a chance to leak the block or free it twice. The MIT Kerberos double free cited by CERT came from exactly this split. One owner per block keeps the lifetime reasoning local to the layer that knows when the data is dead.

## Bad

```c
#include <stdlib.h>

char *make_message(size_t n) {
    return malloc(n);
}

void check_message(char *msg, size_t n) {
    if (n < 32) {
        free(msg);       /* callee frees memory it does not own */
    }
}

int process(size_t n) {
    char *msg = make_message(n);
    if (msg == NULL) {
        return -1;
    }
    check_message(msg, n);   /* may already free msg */
    free(msg);               /* the caller frees it again: double free */
    return 0;
}
```

## Good

```c
#include <stdlib.h>

char *make_message(size_t n) {
    return malloc(n);
}

int check_message(const char *msg, size_t n) {
    return n < 32 ? -1 : 0;   /* checks only; never frees */
}

int process(size_t n) {
    char *msg = make_message(n);
    if (msg == NULL) {
        return -1;
    }
    if (check_message(msg, n) != 0) {
        free(msg);            /* the owner releases exactly once */
        return -1;
    }
    free(msg);
    return 0;
}
```

## See Also

- [c-mem-matching-free](mem-matching-free.md) - what the owner is allowed to pass to `free`
- [c-mem-use-after-free](mem-use-after-free.md) - why the owner must know when the lifetime ends
- [c-mem-clear-after-free](mem-clear-after-free.md) - what the owner should do at the moment of release
