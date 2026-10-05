---
id: c-proj-warning-level
lang: c
prefix: proj
title: Fix the condition a warning reports instead of silencing it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [warnings, Werror, void cast, pragma, suppression]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-static-analysis, c-proj-assertions-build]
sources:
  - title: SEI CERT C - MSC00-C, compile cleanly at high warning levels
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/miscellaneous-msc/msc00-c/
---
> Compile at the highest warning level and change the code; never quiet a warning with a cast or pragma.

## Why

A warning is a diagnostic about a condition the compiler cannot rule out, and suppressing it with a `(void)` cast, an added cast, or a disabled pragma leaves the condition in place while removing the signal. CERT's guidance is to understand the reason and fix the code, reserving suppression for the rare case that is understood and documented. A build that treats warnings as errors keeps the signal alive.

## Bad

```c
int read_config(int *out) {
    (void)out;   /* silences an unused-parameter warning instead of fixing it */
    return 0;
}
```

## Good

```c
#include <stddef.h>

int read_config(int *out) {
    if (out == NULL) {
        return -1;
    }
    *out = 1;   /* the parameter is actually used */
    return 0;
}
```

## See Also

- [c-proj-static-analysis](proj-static-analysis.md) - deeper checks that run alongside the compiler
- [c-proj-assertions-build](proj-assertions-build.md) - the development build these warnings belong to
