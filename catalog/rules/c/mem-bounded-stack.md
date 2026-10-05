---
id: c-mem-bounded-stack
lang: c
prefix: mem
title: Bound every stack allocation and reject sizes from untrusted input
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [VLA, alloca, stack, denial of service, bounds]
  files: ["**/*.c", "**/*.h"]
  symbols: [alloca]
related: [c-mem-zero-size, c-mem-no-dangling-return]
sources:
  - title: SEI CERT C - MEM05-C, avoid large stack allocations
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem05-c/
---
> Size stack storage from a fixed bound, never directly from a value an attacker can influence.

## Why

A variable-length array or `alloca` call whose size comes from input lets one request exhaust the stack and terminate the process, and there is no portable way to detect the failure first. The heap is not better in the abstract, but allocation failure there is reportable, so a bounded stack buffer plus a checked heap allocation gives the program a chance to reject the input instead of dying.

## Bad

```c
#include <stdio.h>

int copy_file(FILE *src, FILE *dst, size_t bufsize) {
    char buf[bufsize];                 /* size may come from the caller */
    while (fgets(buf, (int)bufsize, src) != NULL) {
        if (fputs(buf, dst) == EOF) {
            return -1;
        }
    }
    return 0;
}
```

## Good

```c
#include <stdio.h>
#include <stdlib.h>

enum { CHUNK = 4096 };

int copy_file(FILE *src, FILE *dst, size_t bufsize) {
    if (bufsize == 0 || bufsize > CHUNK) {
        bufsize = CHUNK;               /* clamp to a fixed bound */
    }
    char *buf = malloc(bufsize);
    if (buf == NULL) {
        return -1;
    }
    while (fgets(buf, (int)bufsize, src) != NULL) {
        if (fputs(buf, dst) == EOF) {
            free(buf);
            return -1;
        }
    }
    free(buf);
    return 0;
}
```

## See Also

- [c-mem-zero-size](mem-zero-size.md) - handling the degenerate size before allocating
- [c-mem-no-dangling-return](mem-no-dangling-return.md) - why the buffer moved off the stack must have a real owner
