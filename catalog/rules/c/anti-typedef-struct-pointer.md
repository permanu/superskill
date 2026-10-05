---
id: c-anti-typedef-struct-pointer
lang: c
prefix: anti
title: Do not typedef structures and pointers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [typedef, struct, pointer, naming]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-abbreviations, c-doc-param-names]
sources:
  - title: Linux kernel coding style - Typedefs
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Write `struct name` and `type *` directly; reserve typedefs for genuinely opaque types.

## Why

`point_t p;` hides whether the object is a struct, a pointer, or an integer, so the reader must look up the typedef to know how it is passed and assigned. Kernel style calls typedefs of structures and pointers a mistake and keeps them for opaque handles, fixed-width integers, and userspace-safe types only. Explicit types keep the indirection visible at every use.

## Bad

```c
typedef struct point {
    int x;
    int y;
} point_t;   /* hides that it is a struct */
```

## Good

```c
struct point {
    int x;
    int y;
};
```

## See Also

- [c-anti-abbreviations](anti-abbreviations.md) - names that carry meaning instead of encoding types
- [c-doc-param-names](doc-param-names.md) - making types and roles explicit at declarations
