---
id: c-lint-format-attribute
lang: c
prefix: lint
title: Annotate printf-style wrappers with the format attribute
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [format, attribute, printf, wrapper]
  files: ["**/*.h", "**/*.c"]
  symbols: []
related: [c-lint-nonnull-annotation, c-conv-printf-length]
sources:
  - title: GCC - Common Attributes (format)
    url: https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes
---
> Put `format(printf, ...)` on every printf-style wrapper so call sites are checked.

## Why

The attribute documentation explains that `format` tells the compiler which argument is the format string and where the variadic arguments begin, enabling the same checking the standard printf functions get. A wrapper without it silently accepts mismatched directives and argument types. The annotation costs one declaration and moves the check to every call site.

## Bad

```c
#include <stdarg.h>
#include <stdio.h>

void app_logf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
}
```

## Good

```c
#include <stdarg.h>
#include <stdio.h>

void app_logf(const char *fmt, ...)
    __attribute__((format(printf, 1, 2)));   /* call sites get format checking */

void app_logf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
}
```

## See Also

- [c-lint-nonnull-annotation](lint-nonnull-annotation.md) - the other declaration-level contract
- [c-conv-printf-length](conv-printf-length.md) - the directives the check validates
