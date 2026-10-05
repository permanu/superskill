---
id: c-proj-feature-macros
lang: c
prefix: proj
title: Define feature-test macros before the first include
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [feature test macro, portability, POSIX, header]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-language-standard, c-proj-include-guards]
sources:
  - title: Linux man-pages - feature_test_macros(7)
    url: https://man7.org/linux/man-pages/man7/feature_test_macros.7.html
---
> Put every feature-test macro at the top of the file, before any `#include`.

## Why

A feature-test macro controls which declarations the system headers expose, and it takes effect only if it is defined before any header is processed, because headers include one another. A macro defined between two includes may have no effect on the second one, so the build works in one translation unit and fails in another. Keep the defines first, or pass them on the compiler command line.

## Bad

```c
#include <stdio.h>

#define _DEFAULT_SOURCE   /* too late: headers may already include others */

#include <unistd.h>
```

## Good

```c
#define _DEFAULT_SOURCE   /* first: applies to every header below */

#include <stdio.h>
#include <unistd.h>
```

## See Also

- [c-proj-language-standard](proj-language-standard.md) - the standard version that decides which macros matter
- [c-proj-include-guards](proj-include-guards.md) - the other preprocessing decision at the top of a file
