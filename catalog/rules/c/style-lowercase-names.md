---
id: c-style-lowercase-names
lang: c
prefix: style
title: Name functions and variables in lowercase with underscores
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, lowercase, snake case, identifiers]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-abbreviations, c-style-constants-caps]
sources:
  - title: Linux kernel coding style - Naming
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Use lowercase, underscore-separated names for functions and variables; reserve capitals for constants.

## Why

Kernel style frowns on mixed-case names and keeps globals descriptive and lowercase; the capitalization convention then carries meaning, with capitals marking compile-time constants. Mixed case forces readers to remember exact casing, and case-only differences are a common source of typos and link errors. One case convention for the ordinary namespace keeps lookups mechanical.

## Bad

```c
int ReadValue(int Index);   /* mixed case */
```

## Good

```c
int read_value(int index);   /* lowercase, underscore-separated */
```

## See Also

- [c-anti-abbreviations](anti-abbreviations.md) - spelling the words out
- [c-style-constants-caps](style-constants-caps.md) - where capitals do belong
