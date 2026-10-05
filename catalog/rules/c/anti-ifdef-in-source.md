---
id: c-anti-ifdef-in-source
lang: c
prefix: anti
title: Keep preprocessor conditionals out of source files
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ifdef, conditional compilation, configuration, source]
  files: ["**/*.c"]
  symbols: []
related: [c-proj-feature-macros, c-anti-function-macro]
sources:
  - title: Linux kernel coding style - Conditional Compilation
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Move configuration conditionals into headers or use compile-time constants that fold away.

## Why

An `#ifdef` inside a function hides whole statements from the compiler, so one configuration never type-checks the disabled branch and the function's behavior depends on build flags rather than values. Kernel style asks for the conditional to live in a header that provides either the real function or a no-op stub, and for constant flags to be ordinary expressions the compiler folds. The code stays readable and always checked.

## Bad

```c
int buffer_size(void) {
#ifdef BIG_BUFFERS
    return 65536;
#else
    return 4096;
#endif
}
```

## Good

```c
#ifndef BIG_BUFFERS
#define BIG_BUFFERS 0   /* set by the build, defaulted here */
#endif

int buffer_size(void) {
    return BIG_BUFFERS ? 65536 : 4096;   /* one expression the compiler folds */
}
```

## See Also

- [c-proj-feature-macros](proj-feature-macros.md) - the macros that must be decided before includes
- [c-anti-function-macro](anti-function-macro.md) - the other preprocessor habit to retire
