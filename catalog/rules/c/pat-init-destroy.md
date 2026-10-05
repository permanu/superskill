---
id: c-pat-init-destroy
lang: c
prefix: pat
title: Give each subsystem an explicit start and stop pair
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [init, destroy, lifecycle, module]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-pat-opaque-type, c-mem-single-owner]
sources:
  - title: SEI CERT C - MEM00-C, allocate and free memory in the same module, at the same level of abstraction
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem00-c/
---
> Acquire module resources in one start function and release them in one stop function at the same level.

## Why

CERT's memory-management recommendation is to allocate and free at the same level of abstraction and in the same module. A subsystem that acquires resources in `start` but releases them from wherever an operation happens to end scatters the ownership and leaks whenever a path is missed. One stop function gives every resource one release site and makes shutdown a single call.

## Bad

```c
#include <stdlib.h>

int *module_state;

int module_start(void) {
    module_state = calloc(16, sizeof *module_state);
    return module_state == NULL ? -1 : 0;
}

int module_run(void) {
    if (module_state == NULL) {
        return -1;
    }
    free(module_state);   /* released inside an operation, not at shutdown */
    return 0;
}
```

## Good

```c
#include <stdlib.h>

static int *module_state;

int module_start(void) {
    module_state = calloc(16, sizeof *module_state);
    return module_state == NULL ? -1 : 0;
}

void module_stop(void) {
    free(module_state);   /* one place owns both acquire and release */
    module_state = NULL;
}
```

## See Also

- [c-pat-opaque-type](pat-opaque-type.md) - hiding the state this pair manages
- [c-mem-single-owner](mem-single-owner.md) - the ownership rule behind the pair
