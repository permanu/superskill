---
id: c-lint-valgrind
lang: c
prefix: lint
title: Run the test suite under Valgrind memcheck
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [valgrind, memcheck, leaks, invalid access]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-sanitizers, c-lint-cppcheck]
sources:
  - title: Valgrind - Quick Start
    url: https://valgrind.org/docs/manual/quick-start.html
---
> Run memcheck over the tests and require a clean report.

## Why

Valgrind's quick start documents running a program under `valgrind` to get a detailed report of memory errors and leaks with stack traces, including reads of uninitialized values that no compiler warning models. It complements the sanitizers: it needs no rebuild and catches leaks at exit. A clean memcheck run is a stronger statement than a test suite that merely passes.

## Bad

```c
#include <stdlib.h>

int make_and_drop(void) {
    int *p = malloc(16 * sizeof *p);
    return p == NULL ? -1 : 0;   /* the block is never freed */
}
```

## Good

```c
#include <stdlib.h>

int make_and_drop(void) {
    int *p = malloc(16 * sizeof *p);
    if (p == NULL) {
        return -1;
    }
    free(p);   /* valgrind reports nothing */
    return 0;
}
```

## See Also

- [c-proj-sanitizers](proj-sanitizers.md) - the in-build sanitizer counterparts
- [c-lint-cppcheck](lint-cppcheck.md) - the static second opinion
