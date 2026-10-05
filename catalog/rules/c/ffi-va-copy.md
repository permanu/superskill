---
id: c-ffi-va-copy
lang: c
prefix: ffi
title: Copy a va_list before passing it to another consumer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [va_list, va_copy, variadic, forwarding]
  files: ["**/*.c", "**/*.h"]
  symbols: [va_copy, va_list, va_arg]
related: [c-unsafe-va-arg]
sources:
  - title: cppreference - va_copy
    url: https://en.cppreference.com/w/c/variadic/va_copy
---
> Give each consumer its own `va_list` via `va_copy`; an argument list is consumed as it is read.

## Why

`va_arg` advances the `va_list`, and after it has been passed to a function such as `vfprintf` its state is indeterminate, so reusing the same list reads the wrong arguments or walks off the end. `va_copy` makes an independent list, and each copy is released with `va_end`. The rule is the variadic version of not consuming an iterator twice.

## Bad

```c
#include <stdarg.h>
#include <stdio.h>

void log_twice(const char *fmt, va_list ap) {
    vfprintf(stderr, fmt, ap);
    vfprintf(stderr, fmt, ap);   /* ap is indeterminate after the first use */
}
```

## Good

```c
#include <stdarg.h>
#include <stdio.h>

void log_twice(const char *fmt, va_list ap) {
    va_list copy;
    va_copy(copy, ap);
    vfprintf(stderr, fmt, copy);
    va_end(copy);
    vfprintf(stderr, fmt, ap);   /* each consumer gets its own va_list */
}
```

## See Also

- [c-unsafe-va-arg](unsafe-va-arg.md) - reading arguments with the right type
