---
id: c-macro-constexpr
lang: c
prefix: macro
title: Use constexpr objects for typed compile-time constants
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constexpr, constants, macro, typed]
  files: ["**/*.c", "**/*.h"]
  symbols: [constexpr]
related: [c-macro-related-constants, c-macro-constant-parens]
sources:
  - title: cppreference - constexpr specifier
    url: https://en.cppreference.com/w/c/language/constexpr
---
> Declare compile-time constants as `constexpr` objects instead of object-like macros.

## Why

A macro constant has no type, no scope, and no address, so it bypasses conversion checks and collides with any same-named identifier. A `constexpr` object is a real constant expression with a declared type that the compiler can type-check and that debuggers can see. Macros remain for textual substitution and conditional compilation; values belong to the language.

## Bad

```c
#define MAX_ITEMS 64
```

## Good

```c
constexpr int MAX_ITEMS = 64;

int max_items(void) {
    return MAX_ITEMS;   /* typed, scoped compile-time constant */
}
```

## See Also

- [c-macro-related-constants](macro-related-constants.md) - the related set-of-constants case
- [c-macro-constant-parens](macro-constant-parens.md) - what to do when a macro is still needed
