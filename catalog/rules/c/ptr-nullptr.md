---
id: c-ptr-nullptr
lang: c
prefix: ptr
title: Use nullptr for null pointer values in new code
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nullptr, "NULL", null pointer constant]
  files: ["**/*.c", "**/*.h"]
  symbols: [nullptr, "NULL"]
related: [c-ptr-null-check]
sources:
  - title: cppreference - Predefined null pointer constant
    url: https://en.cppreference.com/w/c/language/nullptr
---
> Spell the null pointer value `nullptr`; it has a pointer type and cannot be confused with an integer.

## Why

`nullptr` is a non-lvalue of type `nullptr_t` that converts to any pointer type, so comparisons and assignments never pass through integer conversion rules. The integer constant `0` also works as a null pointer constant, but it reads as a count in mixed expressions and can silently bind to the wrong type in generic code. In new code the keyword states the intent exactly.

## Bad

```c
#include <stdio.h>

int open_log(const char *path) {
    FILE *f = (path != 0) ? fopen(path, "a") : 0;   /* 0 as a null pointer */
    if (f == 0) {
        return -1;
    }
    fclose(f);
    return 0;
}
```

## Good

```c
#include <stdio.h>

int open_log(const char *path) {
    FILE *f = (path != nullptr) ? fopen(path, "a") : nullptr;
    if (f == nullptr) {
        return -1;
    }
    fclose(f);
    return 0;
}
```

## See Also

- [c-ptr-null-check](ptr-null-check.md) - the check that follows every nullable result
