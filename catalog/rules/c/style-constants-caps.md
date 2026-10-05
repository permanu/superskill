---
id: c-style-constants-caps
lang: c
prefix: style
title: Capitalize macro and enumeration constants
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constants, macros, enums, naming]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-lowercase-names, c-anti-function-macro]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Name macros defining constants and enum labels in capital letters.

## Why

Kernel style capitalizes constant macros and enum labels so a name's role is visible where it is used: `MAX_ITEMS` reads as a compile-time value, while `max_items` reads like a variable that can change. The convention also separates function-like macros, which may be lowercase, from constants. Readers then know what can be an lvalue without looking it up.

## Bad

```c
enum { max_items = 64 };   /* lowercase constant */
```

## Good

```c
enum { MAX_ITEMS = 64 };   /* constants are capitalized */
```

## See Also

- [c-style-lowercase-names](style-lowercase-names.md) - the lowercase convention for everything else
- [c-anti-function-macro](anti-function-macro.md) - what to do with function-like macros
