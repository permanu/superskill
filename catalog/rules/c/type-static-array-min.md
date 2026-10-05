---
id: c-type-static-array-min
lang: c
prefix: type
title: State a minimum element count with the static array parameter form
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static array parameter, minimum count, prototype]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-count-explicit, c-data-array-bounds-library]
sources:
  - title: cppreference - Array declaration
    url: https://en.cppreference.com/w/c/language/array
---
> Declare `T a[static N]` when the function requires at least N elements.

## Why

The array declaration syntax allows `static` inside a parameter's brackets to state that the pointer refers to at least that many elements; the declaration page documents the form and its minimum-count meaning. It turns an unwritten precondition into part of the prototype, so callers and analyzers see the requirement. Passing fewer elements violates the contract and can be diagnosed.

## Bad

```c
#include <stddef.h>

void fill(int *dst, size_t n) {
    for (size_t i = 0; i < 8; ++i) {
        dst[i] = 0;   /* assumes at least 8 elements */
    }
}
```

## Good

```c
#include <stddef.h>

void fill(int dst[static 8]) {
    for (size_t i = 0; i < 8; ++i) {
        dst[i] = 0;   /* the parameter contract requires 8 elements */
    }
}
```

## See Also

- [c-ptr-count-explicit](ptr-count-explicit.md) - passing counts that vary at run time
- [c-data-array-bounds-library](data-array-bounds-library.md) - keeping library calls inside the bounds
