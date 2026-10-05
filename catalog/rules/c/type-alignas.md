---
id: c-type-alignas
lang: c
prefix: type
title: Apply alignas when an access pattern needs more alignment than the default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [alignas, over-alignment, SIMD, alignment]
  files: ["**/*.c", "**/*.h"]
  symbols: [alignas]
related: [c-type-alignof, c-mem-aligned-alloc]
sources:
  - title: cppreference - alignas specifier
    url: https://en.cppreference.com/w/c/language/_Alignas
---
> Request the alignment an over-aligned access requires; the default alignment of a type is not enough for SIMD or cache-line layout.

## Why

The alignment specifier sets a stricter alignment requirement on an object than its type would otherwise have. Code that hands a buffer to vector loads or wants two hot objects on different cache lines needs that guarantee, and the compiler otherwise places the object at the type's natural alignment. The specifier makes the requirement explicit and checkable, and pairs with `alignof` for queries.

## Bad

```c
char buffer[64];   /* may not be aligned for the SIMD code that uses it */
```

## Good

```c
alignas(64) char buffer[64];   /* explicit alignment for the access pattern */
```

## See Also

- [c-type-alignof](type-alignof.md) - querying the alignment that exists
- [c-mem-aligned-alloc](mem-aligned-alloc.md) - the heap side of over-aligned storage
