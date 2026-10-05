---
id: c-num-nan-compare
lang: c
prefix: num
title: Test for NaN before ordering or range comparisons
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NaN, isnan, comparison, range check]
  files: ["**/*.c", "**/*.h"]
  symbols: [isnan, NAN]
related: [c-num-math-errors, c-unsafe-float-int-cast]
sources:
  - title: cppreference - isnan
    url: https://en.cppreference.com/w/c/numeric/math/isnan
---
> Ordered comparisons against NaN are false, so negated checks accept it; test isnan explicitly.

## Why

NaN compares unequal to everything, including itself, and every ordered comparison against it is false; only `!=` is true. So `x >= 0.0 && x <= 1.0` rejects a NaN as out of range while the negation form `!(x < 0.0)` accepts it — two checks that look equivalent are not. Since NaN is a normal result of math functions and parsing, it must be classified before it is compared. `isnan` is the portable test; `x != x` is the equivalent fallback.

## Bad

```c
int reject_negative(double value) {
    return !(value < 0.0);   /* false for NaN: the NaN is accepted */
}
```

## Good

```c
#include <math.h>

int reject_negative(double value) {
    if (isnan(value)) {
        return 0;   /* NaN fails every ordered test: reject it explicitly */
    }
    return !(value < 0.0);
}
```

## See Also

- [c-num-math-errors](num-math-errors.md) - where NaN enters the program
- [c-unsafe-float-int-cast](unsafe-float-int-cast.md) - the cast that turns NaN into undefined behavior
