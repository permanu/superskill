---
id: c-conv-printf-length
lang: c
prefix: conv
title: Match printf length modifiers to the argument type using the inttypes macros
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [printf, length modifier, inttypes, PRId64, format]
  files: ["**/*.c", "**/*.h"]
  symbols: [PRId64, PRIu32, printf, fprintf]
related: [c-conv-fixed-width, c-io-format-string-literal]
sources:
  - title: cppreference - printf, fprintf, sprintf, snprintf
    url: https://en.cppreference.com/w/c/io/fprintf
  - title: cppreference - Fixed width integer types
    url: https://en.cppreference.com/w/c/types/integer
---
> Use the `inttypes.h` macros so each format directive matches its argument's exact type.

## Why

A format directive and its argument are not type-checked by the language; a mismatch reads the wrong bytes and is undefined behavior. Truncating a value with a cast to fit a familiar directive destroys data and hides the bug. The `PRI*` macros expand to the exact length modifier for the fixed-width type on the current platform, so the format stays correct where widths differ.

## Bad

```c
#include <stdint.h>
#include <stdio.h>

void show(int64_t v) {
    printf("%d\n", (int)v);   /* truncates the value to fit the format */
}
```

## Good

```c
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

void show(int64_t v) {
    printf("%" PRId64 "\n", v);   /* length matches the argument type */
}
```

## See Also

- [c-conv-fixed-width](conv-fixed-width.md) - choosing fixed-width types to format
- [c-io-format-string-literal](io-format-string-literal.md) - keeping the format itself constant
