---
id: c-macro-va-opt
lang: c
prefix: macro
title: Use __VA_OPT__ for optional variadic macro arguments
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [variadic macro, __VA_OPT__, comma, GNU extension]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-do-while, c-macro-param-parens]
sources:
  - title: cppreference - Replacing text macros
    url: https://en.cppreference.com/w/c/preprocessor/replace
---
> Guard the separating comma with `__VA_OPT__(,)` instead of the GNU `##` comma trick.

## Why

A variadic macro that forwards `__VA_ARGS__` must not emit the leading comma when the variable part is empty, and the traditional `, ##__VA_ARGS__` solution is a GNU extension. The standard `__VA_OPT__(,)` includes the comma only when there are tokens to follow, so the macro behaves correctly on any conforming preprocessor. It also makes the intent explicit at the point of the comma.

## Bad

```c
#include <stdio.h>

#define LOG(fmt, ...) fprintf(stderr, fmt, ##__VA_ARGS__)   /* GNU extension */

void report(int value) {
    LOG("value=%d\n", value);
}
```

## Good

```c
#include <stdio.h>

#define LOG(fmt, ...) fprintf(stderr, fmt __VA_OPT__(,) __VA_ARGS__)   /* standard */

void report(int value) {
    LOG("value=%d\n", value);
}
```

## See Also

- [c-macro-do-while](macro-do-while.md) - wrapping the expansion
- [c-macro-param-parens](macro-param-parens.md) - parenthesizing the fixed part
