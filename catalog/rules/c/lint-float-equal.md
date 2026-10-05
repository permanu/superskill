---
id: c-lint-float-equal
lang: c
prefix: lint
title: Enable float-equal and replace exact comparisons with tolerances
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [float-equal, comparison, tolerance, warning]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-num-nan-compare, c-lint-opt-in-warnings]
sources:
  - title: Clang - Diagnostic flags reference
    url: https://clang.llvm.org/docs/DiagnosticsReference.html
---
> Turn on `-Wfloat-equal` and compare computed values with an explicit tolerance.

## Why

`-Wfloat-equal`, listed with the other Clang diagnostics, warns on exact equality comparisons between floating-point values, because results that are mathematically equal usually differ after rounding. Exact comparison remains correct for values that are copied rather than computed, which is why the flag is opt-in and why each suppression needs a reason. For computed values, compare the difference against a tolerance.

## Bad

```c
int same(double a, double b) {
    return a == b;   /* -Wfloat-equal flags the exact comparison */
}
```

## Good

```c
#include <math.h>

int close_enough(double a, double b, double eps) {
    return fabs(a - b) <= eps;
}
```

## See Also

- [c-num-nan-compare](num-nan-compare.md) - the other way floating comparisons surprise
- [c-lint-opt-in-warnings](lint-opt-in-warnings.md) - the flag set this belongs to
