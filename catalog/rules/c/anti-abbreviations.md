---
id: c-anti-abbreviations
lang: c
prefix: anti
title: Name identifiers for their meaning, not a puzzle
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, abbreviations, globals, readability]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-typedef-struct-pointer, c-anti-shadowing]
sources:
  - title: Linux kernel coding style - Naming
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Write global names in full and local names that a reader can parse at a glance.

## Why

Kernel style calls `cntusr()` for `count_active_users()` a shooting offense, and the same standard applies to types and files: an abbreviation forces every reader to reconstruct the word, and the wrong reconstruction changes the meaning. Full names on globals and API, short but real words on locals, keep the code self-describing. Hungarian-style type prefixes are noise the compiler already handles.

## Bad

```c
int cntusr(void);   /* name is an abbreviation puzzle */
```

## Good

```c
int count_active_users(void);
```

## See Also

- [c-anti-typedef-struct-pointer](anti-typedef-struct-pointer.md) - names that do not encode types either
- [c-anti-shadowing](anti-shadowing.md) - descriptive names that keep scopes distinct
