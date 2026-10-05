---
id: c-num-float-model
lang: c
prefix: num
title: Guard code that depends on IEC 60559 semantics with the feature macro
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [IEEE 754, INFINITY, NaN, feature macro, portability]
  files: ["**/*.c", "**/*.h"]
  symbols: [INFINITY, NAN, __STDC_IEC_60559_BFP__]
related: [c-num-nan-compare, c-num-math-errors]
sources:
  - title: cppreference - C23 (ISO/IEC 9899:2024)
    url: https://en.cppreference.com/w/c/23
---
> Use `__STDC_IEC_60559_BFP__` to detect binary floating-point conformance before relying on infinities or NaN.

## Why

The standard does not require binary floating point, so `INFINITY` and `NAN` are only defined where the implementation provides the IEC 60559 binary model, signaled by the feature-test macro. Code that assumes infinities and NaN payloads compiles and runs on the common platforms and fails where the model is absent. A conditional keeps the fallback explicit instead of relying on luck.

## Bad

```c
#include <math.h>

double capped(double value) {
    return value > 1e308 ? INFINITY : value;   /* INFINITY may not exist */
}
```

## Good

```c
#include <math.h>

#ifdef __STDC_IEC_60559_BFP__
double capped(double value) {
    return value > 1e308 ? INFINITY : value;
}
#else
double capped(double value) {
    return value > 1e308 ? 1e308 : value;   /* no infinities assumed */
}
#endif
```

## See Also

- [c-num-nan-compare](num-nan-compare.md) - semantics that only exist in this model
- [c-num-math-errors](num-math-errors.md) - the error values the model produces
