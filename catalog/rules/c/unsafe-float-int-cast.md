---
id: c-unsafe-float-int-cast
lang: c
prefix: unsafe
title: Check floating-point values before converting to integers
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [float to int, NaN, range, conversion]
  files: ["**/*.c", "**/*.h"]
  symbols: [isnan, isinf]
related: [c-unsafe-divide-zero, c-ptr-integer-roundtrip]
sources:
  - title: SEI CERT C - FLP34-C, ensure that floating-point conversions are within range of the new type
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/floating-point-flp/flp34-c/
---
> Reject NaN and out-of-range values before converting a floating-point value to an integer.

## Why

If the integral part of a floating-point value cannot be represented in the destination integer type, the conversion is undefined behavior; NaN is likewise out of every integer range. Values arrive from arithmetic, parsing, or sensors where infinity and NaN are normal results, so the check belongs immediately before the cast. Compare against the destination limits and test `isnan` first.

## Bad

```c
int to_percent(double ratio) {
    return (int)(ratio * 100.0);   /* NaN or out-of-range: undefined */
}
```

## Good

```c
#include <limits.h>
#include <math.h>

int to_percent(double ratio) {
    if (isnan(ratio) || ratio < INT_MIN / 100.0 || ratio > INT_MAX / 100.0) {
        return -1;   /* the conversion would be out of range */
    }
    return (int)(ratio * 100.0);
}
```

## See Also

- [c-unsafe-divide-zero](unsafe-divide-zero.md) - another value precondition before arithmetic
- [c-ptr-integer-roundtrip](ptr-integer-roundtrip.md) - the integer-side representability rule
