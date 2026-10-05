---
id: c-anti-extern-functions
lang: c
prefix: anti
title: Do not write extern on function declarations
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [extern, function declaration, redundant]
  files: ["**/*.h"]
  symbols: [extern]
related: [c-proj-header-declarations, c-anti-typedef-struct-pointer]
sources:
  - title: Linux kernel coding style - Function prototypes
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Omit `extern` from function declarations; functions have external linkage by default.

## Why

`extern` on a function declaration adds no linkage information, because functions are external by default, and it makes the line longer for no benefit. Kernel style asks for it to be dropped. Reserving the keyword for object declarations, where it actually changes meaning, keeps its presence informative.

## Bad

```c
extern int compute(int value);   /* extern is redundant here */
```

## Good

```c
int compute(int value);   /* declarations are extern by default */
```

## See Also

- [c-proj-header-declarations](proj-header-declarations.md) - where these declarations belong
- [c-anti-typedef-struct-pointer](anti-typedef-struct-pointer.md) - the same preference for plain declarations
