---
id: c-macro-related-constants
lang: c
prefix: macro
title: Prefer an enum to a chain of related object-like macros
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, macros, related constants, grouping]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-macro-constexpr, c-style-constants-caps]
sources:
  - title: Linux kernel coding style - Macros, Enums and RTL
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Group related constants in an enum; keep macros for textual substitution only.

## Why

Kernel style prefers enums when several related constants are defined, because an enum groups them under one type-like name, gives them a shared declaration, and lets debuggers and tools see the set. A chain of `#define`s has no grouping, cannot be passed as a type, and collides with identifiers elsewhere. The enumerators remain integer constant expressions usable in array sizes and case labels.

## Bad

```c
#define MODE_READ 0
#define MODE_WRITE 1
#define MODE_APPEND 2
```

## Good

```c
enum mode {
    MODE_READ,
    MODE_WRITE,
    MODE_APPEND,
};
```

## See Also

- [c-macro-constexpr](macro-constexpr.md) - single typed constants
- [c-style-constants-caps](style-constants-caps.md) - naming the enumerators
