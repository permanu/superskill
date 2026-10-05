---
id: c-unsafe-va-arg
lang: c
prefix: unsafe
title: Read variadic arguments with their promoted type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [va_arg, variadic, promotion, type mismatch]
  files: ["**/*.c", "**/*.h"]
  symbols: [va_arg, va_start, va_end]
related: [c-unsafe-setjmp-volatile, c-unsafe-eval-order]
sources:
  - title: cppreference - va_arg
    url: https://en.cppreference.com/w/c/variadic/va_arg
---
> Match `va_arg`'s requested type to the argument after default argument promotions.

## Why

`va_arg` is undefined unless the requested type is compatible with the promoted type of the next argument, with narrow exceptions for signed/unsigned pairs and character pointers versus `void *`. `float` arguments arrive as `double`, and small integer types arrive as `int`, so reading them as `float` or `short` misinterprets the value and walks the argument list out of step. Fix the type at the call site or document the exact promoted type.

## Bad

```c
#include <stdarg.h>
#include <stdio.h>

double first_value(int n, ...) {
    va_list ap;
    va_start(ap, n);
    double v = va_arg(ap, double);   /* caller passes int */
    va_end(ap);
    return v;
}

int run(void) {
    return (int)first_value(1, 42);   /* int argument, double read: undefined */
}
```

## Good

```c
#include <stdarg.h>
#include <stdio.h>

double first_value(int n, ...) {
    va_list ap;
    va_start(ap, n);
    int v = va_arg(ap, int);         /* matches the promoted argument */
    va_end(ap);
    return (double)v;
}

int run(void) {
    return (int)first_value(1, 42);
}
```

## See Also

- [c-unsafe-setjmp-volatile](unsafe-setjmp-volatile.md) - the other non-local control-flow contract
- [c-unsafe-eval-order](unsafe-eval-order.md) - argument evaluation at the call site
