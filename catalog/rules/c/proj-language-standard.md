---
id: c-proj-language-standard
lang: c
prefix: proj
title: Compile with an explicit standard version and no GNU dialect
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [std, dialect, pedantic, extensions, build flags]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-feature-macros, c-proj-warning-level]
sources:
  - title: GCC - Options Controlling C Dialect
    url: https://gcc.gnu.org/onlinedocs/gcc/C-Dialect-Options.html
---
> Pass an explicit ISO `-std=` value so extensions are not accepted by accident.

## Why

Compilers default to a GNU dialect that enables extensions and changes the meaning of some conforming code, so a build that does not pin the standard can start rejecting or reinterpreting code when the default moves. An explicit base standard plus `-pedantic` makes extension use visible at the point it is written, not at the next toolchain upgrade. Extensions that are genuinely needed can then be isolated and documented.

## Bad

```c
int max_int(int a, int b) {
    return ({ int x = a; int y = b; x > y ? x : y; });   /* GNU statement expression */
}
```

## Good

```c
int max_int(int a, int b) {
    return a > b ? a : b;   /* portable C only */
}
```

## See Also

- [c-proj-feature-macros](proj-feature-macros.md) - controlling which declarations the headers expose
- [c-proj-warning-level](proj-warning-level.md) - the diagnostics that flag dialect differences
