---
id: c-anti-function-macro
lang: c
prefix: anti
title: Do not use function-like macros where a function will do
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [macro, inline function, double evaluation, MAX]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-inline-abuse, c-anti-goto-control-flow]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Replace function-like macros with static inline functions; macros evaluate their arguments twice.

## Why

A macro such as `MAX(a, b)` expands its arguments twice, so `MAX(i++, j)` increments `i` twice, and a call that looks like a function can return from the caller or capture a local name. Kernel style prefers inline functions for exactly these reasons: single evaluation, type checking, and normal scoping. Macros remain for constants and conditional compilation.

## Bad

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))   /* arguments evaluated twice */
```

## Good

```c
static int max_int(int a, int b) {
    return a > b ? a : b;
}

int clamp_max(int value, int limit) {
    return max_int(value, limit);
}
```

## See Also

- [c-anti-inline-abuse](anti-inline-abuse.md) - the opposite mistake of over-using inline
- [c-anti-goto-control-flow](anti-goto-control-flow.md) - macros that change control flow
