---
id: c-lint-strict-prototypes
lang: c
prefix: lint
title: Write void for parameterless function declarations
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strict-prototypes, void, declaration, clarity]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-lint-opt-in-warnings, c-ffi-shared-prototypes]
sources:
  - title: Clang - Diagnostic flags reference
    url: https://clang.llvm.org/docs/DiagnosticsReference.html
---
> Prefer `(void)` over empty parentheses so the declaration states "no parameters" explicitly.

## Why

In the current C standard, `()` in a function declaration already means "no parameters", so the compiler checks calls either way; `(void)` makes that intent explicit at a glance and remains the form that tools and older language modes expect, where `-Wstrict-prototypes` flags the empty parentheses. Using one form consistently keeps every declaration unambiguous for readers who cannot know which mode a header will be consumed in.

## Bad

```c
int reset();   /* reads as "parameters unspecified" to many readers */
```

## Good

```c
int reset(void);   /* explicitly no arguments */
```

## See Also

- [c-lint-opt-in-warnings](lint-opt-in-warnings.md) - the flag set this belongs to
- [c-ffi-shared-prototypes](ffi-shared-prototypes.md) - prototypes on the boundary
