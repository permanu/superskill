---
id: c-ptr-offsetof
lang: c
prefix: ptr
title: Compute member offsets with offsetof instead of assuming a layout
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [offsetof, struct layout, padding, member offset]
  files: ["**/*.c", "**/*.h"]
  symbols: [offsetof]
related: [c-ptr-strict-alias, c-mem-flex-array]
sources:
  - title: cppreference - offsetof
    url: https://en.cppreference.com/w/c/types/offsetof
---
> Use offsetof for every offset computation; the compiler owns struct layout, not the programmer.

## Why

Member order, padding, and alignment are implementation choices, so an offset computed from `sizeof` of preceding members silently breaks when the compiler inserts padding or the struct changes. `offsetof` asks the implementation for the real offset, including padding, and stays correct through reordering. It is also the required building block for sizing flexible array allocations.

## Bad

```c
struct record {
    int id;
    long value;
};

int *record_id(struct record *r) {
    return (int *)((char *)r + sizeof(long));   /* assumed layout */
}
```

## Good

```c
#include <stddef.h>

struct record {
    int id;
    long value;
};

int *record_id(struct record *r) {
    return (int *)((char *)r + offsetof(struct record, id));
}
```

## See Also

- [c-ptr-strict-alias](ptr-strict-alias.md) - the types used for the object access
- [c-mem-flex-array](mem-flex-array.md) - offsetof as the base of a flexible array allocation
