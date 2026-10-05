---
id: c-style-pointer-star
lang: c
prefix: style
title: Attach the pointer star to the name, not the type
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pointer, star, declarations, style]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-typedef-struct-pointer, c-style-lowercase-names]
sources:
  - title: Linux kernel coding style - Spaces
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Write `char *name` so the star reads as part of the declarator it belongs to.

## Why

In C the star binds to the declarator, not the type: `int *a, b;` makes `a` a pointer and `b` an int. Writing `int * name` or `int* name` suggests the star belongs to the type, which is exactly the misconception that makes the comma declaration surprising. Kernel style puts the star adjacent to the data or function name so the code matches the grammar.

## Bad

```c
int * global_counter;   /* star detached from the name */
```

## Good

```c
int *global_counter;   /* the star belongs to the declarator */
```

## See Also

- [c-anti-typedef-struct-pointer](anti-typedef-struct-pointer.md) - keeping pointer types explicit
- [c-style-lowercase-names](style-lowercase-names.md) - the naming around the declarator
