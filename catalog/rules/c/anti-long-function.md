---
id: c-anti-long-function
lang: c
prefix: anti
title: Keep functions to one job and a few screenfuls
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [long function, cohesion, locals, split]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-deep-nesting, c-anti-inline-abuse]
sources:
  - title: Linux kernel coding style - Functions
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Split functions that mix unrelated steps or accumulate more than a handful of locals.

## Why

Kernel style asks functions to be short, do one thing, and keep the number of locals within what a reader can track; a function that grows past that usually contains several jobs that should be named separately. Named helpers make each step testable and document the flow through their names. The compiler inlines small static helpers anyway, so splitting rarely costs performance.

## Bad

```c
#include <ctype.h>
#include <stddef.h>

int process_record(int *value, char *name, size_t cap) {
    *value += 1;
    for (size_t i = 0; i < cap && name[i] != '\0'; ++i) {
        name[i] = (char)toupper((unsigned char)name[i]);   /* unrelated job */
    }
    return *value;
}
```

## Good

```c
#include <ctype.h>
#include <stddef.h>

static void uppercase_in_place(char *name, size_t cap) {
    for (size_t i = 0; i < cap && name[i] != '\0'; ++i) {
        name[i] = (char)toupper((unsigned char)name[i]);
    }
}

int process_record(int *value, char *name, size_t cap) {
    uppercase_in_place(name, cap);
    return ++*value;
}
```

## See Also

- [c-anti-deep-nesting](anti-deep-nesting.md) - the shape a function takes when it stays short
- [c-anti-inline-abuse](anti-inline-abuse.md) - why helpers do not need to be inline
