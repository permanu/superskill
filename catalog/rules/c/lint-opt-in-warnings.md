---
id: c-lint-opt-in-warnings
lang: c
prefix: lint
title: Enable the opt-in warning set beyond Wall
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [warnings, conversion, shadow, cast-align, flags]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-warning-level, c-lint-strict-prototypes]
sources:
  - title: Clang - Diagnostic flags reference
    url: https://clang.llvm.org/docs/DiagnosticsReference.html
---
> Turn on conversion, shadow, cast-align, and VLA warnings in addition to `-Wall`.

## Why

Clang's diagnostic reference documents each flag separately, and several of the most valuable ones are not in `-Wall`: `-Wconversion` reports implicit narrowing, `-Wshadow` reports hidden declarations, `-Wcast-align` reports alignment-raising casts, and `-Wvla` reports variable-length arrays. They are off by default because they fire on deliberate idioms, but a project that fixes them gets the guarantee. Enable the set once, in the build.

## Bad

```c
int narrow(long value) {
    return value;   /* -Wconversion flags the implicit narrowing */
}
```

## Good

```c
#include <limits.h>

int narrow(long value, int *out) {
    if (value < INT_MIN || value > INT_MAX) {
        return -1;
    }
    *out = (int)value;   /* explicit and checked */
    return 0;
}
```

## See Also

- [c-proj-warning-level](proj-warning-level.md) - fixing rather than silencing what the flags find
- [c-lint-strict-prototypes](lint-strict-prototypes.md) - one of the opt-in flags in detail
