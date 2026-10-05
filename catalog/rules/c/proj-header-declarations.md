---
id: c-proj-header-declarations
lang: c
prefix: proj
title: Headers declare, sources define
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [header, definition, declaration, linkage, duplicate symbol]
  files: ["**/*.h"]
  symbols: []
related: [c-proj-internal-linkage, c-proj-include-guards]
sources:
  - title: cppreference - External and tentative definitions
    url: https://en.cppreference.com/w/c/language/extern
---
> Put function and object definitions in source files; a header carries declarations and type definitions only.

## Why

A function defined in a header is defined again in every translation unit that includes it, and linking fails with duplicate symbols unless the function is `static` or `inline` with a matching declaration. Tentative object definitions in headers multiply across units and merge unpredictably. One definition lives in one source file; the header publishes its declaration.

## Bad

```c
/* settings.h - defines the function here */
int max_level(void) {
    return 10;
}
```

## Good

```c
/* settings.h - declares it */
int max_level(void);
```

## See Also

- [c-proj-internal-linkage](proj-internal-linkage.md) - which definitions may stay file-local
- [c-proj-include-guards](proj-include-guards.md) - protecting the declarations on multiple inclusion
