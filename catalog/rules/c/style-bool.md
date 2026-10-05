---
id: c-style-bool
lang: c
prefix: style
title: Use bool for values that are true or false
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bool, boolean, stdbool, "true", "false"]
  files: ["**/*.c", "**/*.h"]
  symbols: [bool, "true", "false"]
related: [c-style-lowercase-names, c-conv-promotion]
sources:
  - title: Linux kernel coding style - Using bool
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
  - title: cppreference - Boolean type
    url: https://en.cppreference.com/w/c/types/boolean
---
> Declare two-state values as `bool` and use `true`/`false` instead of 1/0.

## Why

`bool` converts any nonzero value to exactly 1, so it eliminates the class of bugs where a flag holds 2 or -1 and later arithmetic treats it as a number. Kernel style recommends it for function return types and locals wherever cache layout is not at stake. Comparing against `true` and `false` states intent where `1` and `0` invite confusion with counts.

## Bad

```c
int is_valid(int value) {
    return value > 0 ? 1 : 0;   /* int used as a boolean */
}
```

## Good

```c
#include <stdbool.h>

bool is_valid(int value) {
    return value > 0;
}
```

## See Also

- [c-style-lowercase-names](style-lowercase-names.md) - the naming around the type
- [c-conv-promotion](conv-promotion.md) - why int-valued flags drift
