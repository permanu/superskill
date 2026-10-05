---
id: c-conv-float-narrowing
lang: c
prefix: conv
title: Check the range before narrowing a floating-point value
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [float, double, narrowing, FLT_MAX, precision]
  files: ["**/*.c", "**/*.h"]
  symbols: [FLT_MAX, isnan]
related: [c-conv-checked-narrow, c-unsafe-float-int-cast]
sources:
  - title: SEI CERT C - FLP34-C, ensure that floating-point conversions are within range of the new type
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/floating-point-flp/flp34-c/
---
> Reject NaN and values outside the destination range before converting to a narrower floating type.

## Why

Converting a floating-point value to a type that cannot represent it is undefined behavior, and the failure is silent when the value later becomes infinity or a denormal that comparisons treat as zero. Parsed numbers and accumulated results routinely exceed the narrower range. Test `isnan` and the destination maximum before the conversion.

## Bad

```c
float to_ratio(double value) {
    return (float)value;   /* may overflow or lose precision silently */
}
```

## Good

```c
#include <float.h>
#include <math.h>

float to_ratio(double value) {
    if (isnan(value) || fabs(value) > FLT_MAX) {
        return 0.0f;   /* reject values float cannot represent */
    }
    return (float)value;
}
```

## See Also

- [c-conv-checked-narrow](conv-checked-narrow.md) - the integer version of the same range test
- [c-unsafe-float-int-cast](unsafe-float-int-cast.md) - converting all the way to integers
