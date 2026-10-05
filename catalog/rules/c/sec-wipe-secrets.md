---
id: c-sec-wipe-secrets
lang: c
prefix: sec
title: Wipe sensitive buffers with a primitive the optimizer cannot remove
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wipe, memset, sensitive, zeroize, free]
  files: ["**/*.c", "**/*.h"]
  symbols: [memset, memset_s, explicit_bzero]
related: [c-sec-hardcoded-secrets, c-mem-clear-after-free]
sources:
  - title: SEI CERT C - MEM03-C, clear sensitive information stored in reusable resources
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem03-c/
---
> Zero keys and passwords through a call the optimizer must keep, before freeing or returning.

## Why

Freed and stack memory is reused, and allocators do not clear it, so a key left behind can leak into unrelated data or another process. A plain `memset` over a buffer that is about to die is a dead store that optimizing compilers may delete. Wipe through `memset_s`, `explicit_bzero`, or a volatile function pointer so the clearing survives compilation.

## Bad

```c
#include <string.h>

void unlock(const char *password) {
    char key[32];
    memcpy(key, password, 32);
    /* use key */
    memset(key, 0, sizeof key);   /* dead store: may be optimized away */
}
```

## Good

```c
#include <string.h>

static void *(*const volatile secure_memset)(void *, int, size_t) = memset;

void unlock(const char *password) {
    char key[32];
    memcpy(key, password, 32);
    /* use key */
    secure_memset(key, 0, sizeof key);   /* the optimizer cannot elide it */
}
```

## See Also

- [c-sec-hardcoded-secrets](sec-hardcoded-secrets.md) - where the secret comes from
- [c-mem-clear-after-free](mem-clear-after-free.md) - pointer hygiene at the same release point
