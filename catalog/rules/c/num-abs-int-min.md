---
id: c-num-abs-int-min
lang: c
prefix: num
title: Check for the most-negative value before taking an absolute value
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abs, INT_MIN, absolute value, overflow]
  files: ["**/*.c", "**/*.h"]
  symbols: [abs, imaxabs, INT_MIN]
related: [c-num-signed-overflow, c-num-int-min-division]
sources:
  - title: cppreference - abs, labs, llabs, imaxabs
    url: https://en.cppreference.com/w/c/numeric/math/abs
---
> Reject the most-negative value before calling abs; its magnitude is not representable.

## Why

On two's complement, the most-negative value has no positive counterpart, so `abs(INT_MIN)` cannot be represented and is undefined behavior. cppreference notes the exact case: INT_MIN is -2147483648 while the would-be result exceeds INT_MAX. Test for the minimum value and return an error or widen the type.

## Bad

```c
#include <stdlib.h>

int magnitude(int value) {
    return abs(value);   /* abs(INT_MIN) is undefined */
}
```

## Good

```c
#include <limits.h>
#include <stdlib.h>

int magnitude(int value, int *out) {
    if (value == INT_MIN) {
        return -1;   /* the magnitude is not representable */
    }
    *out = abs(value);
    return 0;
}
```

## See Also

- [c-num-signed-overflow](num-signed-overflow.md) - the general signed overflow rule
- [c-num-int-min-division](num-int-min-division.md) - the other operation that fails only at the minimum
