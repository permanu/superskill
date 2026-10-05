---
id: c-mem-flex-array
lang: c
prefix: mem
title: Allocate a flexible array member as offsetof plus count times element size
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [flexible array member, offsetof, struct, allocation]
  files: ["**/*.c", "**/*.h"]
  symbols: [offsetof, malloc, memcpy]
related: [c-mem-sizeof-object, c-err-ckd-arithmetic, c-mem-use-after-free]
sources:
  - title: SEI CERT C - MEM33-C, allocate and copy structures containing a flexible array member dynamically
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/memory-management-mem/mem33-c/
---
> Size a flexible array allocation with `offsetof` plus the element count, and keep such structs off the stack.

## Why

`sizeof` on a struct with a flexible array member counts none of the trailing elements, so allocating with `sizeof *p` alone leaves `data[]` unusable and any access to it is undefined behavior. The correct size is the fixed part plus the element count, computed with checked arithmetic. Flexible-array structs also must not be assigned by value or placed on the stack, because the compiler has no storage for the tail.

## Bad

```c
#include <stdlib.h>

struct packet {
    size_t len;
    char data[];
};

struct packet *make_packet(size_t n) {
    struct packet *p = malloc(sizeof *p);   /* no room for data */
    if (p == NULL) {
        return NULL;
    }
    p->len = n;
    return p;
}
```

## Good

```c
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

struct packet {
    size_t len;
    char data[];
};

struct packet *make_packet(size_t n) {
    if (n > SIZE_MAX - offsetof(struct packet, data)) {
        return NULL;                        /* size computation would wrap */
    }
    struct packet *p = malloc(offsetof(struct packet, data) + n);
    if (p == NULL) {
        return NULL;
    }
    p->len = n;
    return p;
}
```

## See Also

- [c-mem-sizeof-object](mem-sizeof-object.md) - the single-object case of allocation sizing
- [c-err-ckd-arithmetic](err-ckd-arithmetic.md) - the checked arithmetic behind the size test
- [c-mem-use-after-free](mem-use-after-free.md) - what invalidates the tail storage
