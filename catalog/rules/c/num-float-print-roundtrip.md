---
id: c-num-float-print-roundtrip
lang: c
prefix: num
title: Print floating-point values with enough digits to round-trip
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [printf, precision, round-trip, DBL_DECIMAL_DIG]
  files: ["**/*.c", "**/*.h"]
  symbols: [DBL_DECIMAL_DIG]
related: [c-conv-printf-length, c-num-float-literals]
sources:
  - title: cppreference - Numeric limits
    url: https://en.cppreference.com/w/c/types/limits
---
> Use `DBL_DECIMAL_DIG` (or the float counterpart) precision when output must preserve the value.

## Why

A fixed precision such as `%.2f` loses information, and even `%.17g`-style guesses depend on the type; the standard provides `DBL_DECIMAL_DIG`, the number of decimal digits that round-trips a double, and its float and long double counterparts. Output that feeds another program or a test corpus must reproduce the exact value. Use the macro as the precision instead of a remembered constant.

## Bad

```c
#include <stdio.h>

void show(double value) {
    printf("%.2f\n", value);   /* loses precision: cannot round-trip */
}
```

## Good

```c
#include <float.h>
#include <stdio.h>

void show(double value) {
    printf("%.*g\n", DBL_DECIMAL_DIG, value);   /* round-trips the value */
}
```

## See Also

- [c-conv-printf-length](conv-printf-length.md) - formatting the right types
- [c-num-float-literals](num-float-literals.md) - the input side of the same precision question
