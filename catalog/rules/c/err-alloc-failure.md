---
id: c-err-alloc-failure
lang: c
prefix: err
title: Treat allocation failure as an ordinary error and keep the old block valid when realloc fails
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [malloc, realloc, allocation, "NULL", leak]
  files: ["**/*.c", "**/*.h"]
  symbols: [malloc, calloc, realloc, free]
related: [c-err-goto-cleanup, c-err-ckd-arithmetic, c-err-check-return-values]
sources:
  - title: cppreference - malloc
    url: https://en.cppreference.com/w/c/memory/malloc
  - title: cppreference - realloc
    url: https://en.cppreference.com/w/c/memory/realloc
  - title: SEI CERT C - ERR33-C, detect and handle standard library errors
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err33-c/
---
> Check every allocation result before use, and never assign realloc's result over the only pointer to the old block.

## Why

`malloc`, `calloc`, and `realloc` return a null pointer on failure; dereferencing it is undefined behavior. `realloc` adds a sharper hazard: on failure it leaves the original block allocated but returns null, so assigning the result back to the original pointer leaks the block and loses the only handle to it. Route the result through a temporary and commit only on success.

## Bad

```c
#include <stdlib.h>

int reserve(char **buf, size_t new_count, size_t elem_size) {
    *buf = realloc(*buf, new_count * elem_size);   /* old block lost if this fails */
    return *buf == NULL ? -1 : 0;
}
```

## Good

```c
#include <stdlib.h>

int reserve(char **buf, size_t new_count, size_t elem_size) {
    if (new_count == 0) {
        return -1;                  /* a zero-size realloc is not a resize */
    }
    void *tmp = realloc(*buf, new_count * elem_size);
    if (tmp == NULL) {
        return -1;                  /* *buf still owns the valid old block */
    }
    *buf = tmp;
    return 0;
}
```

## See Also

- [c-err-goto-cleanup](err-goto-cleanup.md) - unwinding blocks acquired before the failing allocation
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - the size multiplication this call must not overflow
- [c-err-check-return-values](err-check-return-values.md) - the general rule for failure-reporting calls
