---
id: c-ffi-shared-prototypes
lang: c
prefix: ffi
title: Declare each boundary function once, in the shared header
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [prototype, shared header, ABI, declaration]
  files: ["**/*.h", "**/*.c"]
  symbols: []
related: [c-proj-header-declarations, c-ffi-error-type]
sources:
  - title: cppreference - External and tentative definitions
    url: https://en.cppreference.com/w/c/language/extern
---
> Both sides of a boundary include the same declaration; never redeclare a library function locally.

## Why

An external declaration fixes the function's type for every caller, and two hand-written declarations can disagree in parameter types or signedness while both compile, producing undefined behavior at the call. cppreference describes these declarations as the program's link surface, so one header should own each of them. A local copy of a prototype is an ABI fork waiting to happen.

## Bad

```c
/* consumer.c declares its own version */
int parse_config(const char *path, int flags);   /* the library uses unsigned */
```

## Good

```c
/* config.h - the single declaration both sides include */
unsigned parse_config(const char *path, unsigned flags);

/* consumer.c */
int use_config(const char *path) {
    return (int)parse_config(path, 0u);   /* one declaration, one ABI */
}
```

## See Also

- [c-proj-header-declarations](proj-header-declarations.md) - headers declare, sources define
- [c-ffi-error-type](ffi-error-type.md) - making the return side just as explicit
