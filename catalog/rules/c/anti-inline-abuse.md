---
id: c-anti-inline-abuse
lang: c
prefix: anti
title: Do not mark every function inline
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [inline, optimization, code size, icache]
  files: ["**/*.c", "**/*.h"]
  symbols: [inline]
related: [c-anti-function-macro, c-anti-long-function]
sources:
  - title: Linux kernel coding style - The inline disease
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Let the compiler decide on inlining; reserve `inline` for tiny helpers and compile-time-constant cases.

## Why

`inline` is a hint, not an optimization switch, and applying it broadly grows the binary until the instruction cache thrashes, which slows the program as a whole. Kernel style's rule of thumb is to avoid `inline` on functions longer than a few lines and to leave single-use static functions to the compiler. Measure before forcing inlining.

## Bad

```c
inline int add_one(int value) {
    return value + 1;
}

inline int add_two(int value) {
    return add_one(add_one(value));
}
```

## Good

```c
int add_one(int value) {
    return value + 1;
}

int add_two(int value) {
    return add_one(add_one(value));
}
```

## See Also

- [c-anti-function-macro](anti-function-macro.md) - where inline functions are the right replacement
- [c-anti-long-function](anti-long-function.md) - the functions that should never be inline
