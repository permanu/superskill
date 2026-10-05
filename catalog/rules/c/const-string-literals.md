---
id: c-const-string-literals
lang: c
prefix: const
title: Store string literals in const char pointers
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string literal, const, read-only, undefined behavior]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-no-const-cast, c-const-pointer-fixed]
sources:
  - title: cppreference - String literals
    url: https://en.cppreference.com/w/c/language/string_literal
---
> Declare pointers to string literals `const char *`; modifying a literal is undefined behavior.

## Why

cppreference documents that string literals have static storage and that attempting to modify one is undefined behavior, which is why implementations may place them in read-only memory. Assigning a literal to `char *` compiles but invites a write that faults or silently corrupts shared storage. The const qualifier makes the mistake a compile-time error instead.

## Bad

```c
char *greeting = "hello";   /* modifying the literal is undefined behavior */
```

## Good

```c
const char *greeting = "hello";
```

## See Also

- [c-ptr-no-const-cast](ptr-no-const-cast.md) - what removing the qualifier costs
- [c-const-pointer-fixed](const-pointer-fixed.md) - qualifying the pointer itself
