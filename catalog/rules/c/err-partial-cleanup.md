---
id: c-err-partial-cleanup
lang: c
prefix: err
title: Give each acquisition stage its own cleanup label so partial failures release exactly what exists
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [partial failure, double free, cleanup label, one err bug]
  files: ["**/*.c", "**/*.h"]
  symbols: [free, fclose]
related: [c-err-goto-cleanup, c-err-alloc-failure]
sources:
  - title: SEI CERT C - MEM12-C, consider using a goto chain when leaving a function on error when using and releasing resources
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem12-c/
  - title: Linux kernel coding style - Centralized exiting of functions
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
  - title: cppreference - free
    url: https://en.cppreference.com/w/c/memory/free
---
> Split the cleanup chain so a failure during acquisition stage N releases only stages that were actually acquired.

## Why

A single catch-all error label must assume every resource exists, but on an early failure some of them were never acquired, so it frees stale or uninitialized pointers. Kernel style calls this the one-error-label bug. Initializing each slot to a safe value and jumping to the label for the failed stage keeps double frees and leaks out of the unwind path.

## Bad

```c
#include <stdlib.h>

struct config {
    char *name;
    char *value;
};

char *read_string(void);

int load_config(struct config *c) {
    c->name = read_string();
    if (c->name == NULL) {
        goto fail;
    }
    c->value = read_string();
    if (c->value == NULL) {
        goto fail;
    }
    return 0;
fail:                      /* one label for every stage */
    free(c->name);
    free(c->value);        /* value was never acquired on the first failure */
    return -1;
}
```

## Good

```c
#include <stdlib.h>

struct config {
    char *name;
    char *value;
};

char *read_string(void);
int load_config(struct config *c) {
    c->name = NULL;
    c->value = NULL;
    c->name = read_string();
    if (c->name == NULL) {
        goto fail;
    }
    c->value = read_string();
    if (c->value == NULL) {
        goto fail_value;
    }
    return 0;
fail_value:                /* undo the latest stage first */
    free(c->name);
fail:                      /* nothing acquired before name */
    return -1;
}
```

## See Also

- [c-err-goto-cleanup](err-goto-cleanup.md) - the overall forward chain this rule refines
- [c-err-alloc-failure](err-alloc-failure.md) - allocations that must stay valid for this chain to be correct
