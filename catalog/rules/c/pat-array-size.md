---
id: c-pat-array-size
lang: c
prefix: pat
title: Compute array length with an ARRAY_SIZE macro at the declaration site
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ARRAY_SIZE, sizeof, array length, macro]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-count-explicit, c-macro-constant-parens]
sources:
  - title: Linux kernel coding style - Don't re-invent the kernel macros
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Use one `ARRAY_SIZE(a)` macro wherever the length of a real array is needed.

## Why

Kernel style provides `ARRAY_SIZE` so the length of an array is computed the same way everywhere instead of repeating `sizeof(a) / sizeof((a)[0])` or a literal count. One macro keeps the division pattern correct and makes the intent searchable. It applies only to arrays in scope, never to pointers, which is why the count still travels as a parameter across functions.

## Bad

```c
int table[4] = {1, 2, 3, 4};

int table_sum(void) {
    int total = 0;
    for (int i = 0; i < 4; ++i) {   /* the count is written twice */
        total += table[i];
    }
    return total;
}
```

## Good

```c
#include <stddef.h>

#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))

int table[4] = {1, 2, 3, 4};

int table_sum(void) {
    int total = 0;
    for (size_t i = 0; i < ARRAY_SIZE(table); ++i) {
        total += table[i];
    }
    return total;
}
```

## See Also

- [c-ptr-count-explicit](ptr-count-explicit.md) - why this cannot be used on parameters
- [c-macro-constant-parens](macro-constant-parens.md) - parenthesizing the macro body
