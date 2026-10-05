---
id: c-api-destroy-function
lang: c
prefix: api
title: Release library objects through a destroy function
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [destroy, ownership, free, opaque object]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-pat-opaque-type, c-mem-single-owner]
sources:
  - title: SEI CERT C - MEM00-C, allocate and free memory in the same module, at the same level of abstraction
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem00-c/
---
> Give every create function a matching destroy; never require callers to free the object's internals.

## Why

CERT's memory guidance is to allocate and free at the same level of abstraction and in the same module. When an API hands out internal pointers for the caller to free, the layout becomes part of the contract and every caller must free exactly the right pieces in the right order. A destroy function keeps the release inside the module that knows the structure and can change it without breaking callers.

## Bad

```c
#include <stdlib.h>

struct handle;

struct handle *handle_create(void);
void *handle_state(struct handle *h);

int main(void) {
    struct handle *h = handle_create();
    free(handle_state(h));   /* the caller frees the library's internals */
    free(h);
    return 0;
}
```

## Good

```c
#include <stdlib.h>

struct handle;

struct handle *handle_create(void);
void handle_destroy(struct handle *h);

int main(void) {
    struct handle *h = handle_create();
    handle_destroy(h);   /* one API function releases the whole object */
    return 0;
}
```

## See Also

- [c-pat-opaque-type](pat-opaque-type.md) - hiding the internals this function releases
- [c-mem-single-owner](mem-single-owner.md) - the ownership rule behind the pair
