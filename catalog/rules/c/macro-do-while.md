---
id: c-macro-do-while
lang: c
prefix: macro
title: Wrap multi-statement macros in do while zero
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, do while, multiple statements, semicolon]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-no-control-flow, c-macro-constant-parens]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Make a multi-statement macro a single statement with `do { ... } while (0)`.

## Why

A macro that expands to several statements becomes several statements at the call site, so an unbraced `if` controls only the first one and the rest run unconditionally; adding braces at the call site works until someone forgets. Kernel style shows the `do { } while (0)` wrapper so the macro is one statement and requires the trailing semicolon like a function call.

## Bad

```c
#include <stdio.h>

#define BUMP_AND_LOG(counter) \
    fprintf(stderr, "bump\n"); \
    ++counter

int handle(int *count, int do_bump) {
    if (do_bump)
        BUMP_AND_LOG(*count);   /* the increment runs unconditionally */
    return *count;
}
```

## Good

```c
#include <stdio.h>

#define BUMP_AND_LOG(counter) \
    do { \
        fprintf(stderr, "bump\n"); \
        ++(counter); \
    } while (0)

int handle(int *count, int do_bump) {
    if (do_bump) {
        BUMP_AND_LOG(*count);
    }
    return *count;
}
```

## See Also

- [c-macro-no-control-flow](macro-no-control-flow.md) - what must not go inside the wrapper
- [c-macro-constant-parens](macro-constant-parens.md) - parenthesizing what does
