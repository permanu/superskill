---
id: c-proj-internal-linkage
lang: c
prefix: proj
title: Give helpers internal linkage with static
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static, internal linkage, exported surface, translation unit]
  files: ["**/*.c"]
  symbols: []
related: [c-proj-header-declarations, c-proj-reserved-identifiers]
sources:
  - title: cppreference - Storage duration and linkage
    url: https://en.cppreference.com/w/c/language/storage_duration
---
> Declare every function and file-scope object that is not part of the public API `static`.

## Why

A function with external linkage joins the global namespace, where it can collide with another module's symbol and forces the linker to resolve it everywhere. `static` keeps the name inside the translation unit, shrinks the API surface, and lets the compiler inline and discard the helper freely. The public surface should be exactly what the headers declare.

## Bad

```c
int normalize(int value) {   /* exported although only used here */
    return value < 0 ? -value : value;
}

int read_level(int raw) {
    return normalize(raw);
}
```

## Good

```c
static int normalize(int value) {   /* internal to this translation unit */
    return value < 0 ? -value : value;
}

int read_level(int raw) {
    return normalize(raw);
}
```

## See Also

- [c-proj-header-declarations](proj-header-declarations.md) - keeping definitions out of headers
- [c-proj-reserved-identifiers](proj-reserved-identifiers.md) - the names that must not be exported
