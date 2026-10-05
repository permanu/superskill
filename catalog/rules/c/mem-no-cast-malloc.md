---
id: c-mem-no-cast-malloc
lang: c
prefix: mem
title: Do not cast the result of malloc; include stdlib.h and let void * convert implicitly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [malloc, cast, void pointer, prototype]
  files: ["**/*.c", "**/*.h"]
  symbols: [malloc, calloc, realloc]
related: [c-mem-sizeof-object, c-mem-single-owner]
sources:
  - title: Linux kernel coding style - Allocating memory
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
  - title: cppreference - malloc
    url: https://en.cppreference.com/w/c/memory/malloc
---
> Assign an allocation function's `void *` result directly; the conversion is implicit and the cast adds only risk.

## Why

C converts `void *` to any object pointer implicitly, so the cast is redundant. It is also harmful: in a translation unit that forgets `<stdlib.h>`, the cast silences the diagnostic for the missing prototype and the implicit `int` return truncates the pointer on targets where pointers are wider than integers. Removing the cast lets the compiler report the real problem.

## Bad

```c
#include <stdlib.h>

int *make_list(size_t n) {
    int *list = (int *)malloc(n * sizeof *list);   /* cast hides a missing prototype */
    return list;
}
```

## Good

```c
#include <stdlib.h>

int *make_list(size_t n) {
    int *list = malloc(n * sizeof *list);   /* void * converts implicitly */
    return list;
}
```

## See Also

- [c-mem-sizeof-object](mem-sizeof-object.md) - the size argument of the same call
- [c-mem-single-owner](mem-single-owner.md) - who releases the returned pointer
