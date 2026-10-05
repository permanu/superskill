---
id: c-pat-opaque-type
lang: c
prefix: pat
title: Hide a type's layout behind an opaque declaration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [opaque type, incomplete type, ABI, header]
  files: ["**/*.h", "**/*.c"]
  symbols: []
related: [c-anti-typedef-struct-pointer, c-pat-init-destroy]
sources:
  - title: Linux kernel coding style - Typedefs
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Expose only a forward declaration and accessor functions; keep the struct definition in the source file.

## Why

Kernel style allows typedefs exactly for totally opaque objects that can only be reached through accessor functions. When the layout stays in one translation unit, changing a field cannot break callers, the ABI survives, and every mutation goes through the functions that maintain the invariant. Public struct definitions freeze the layout for every consumer.

## Bad

```c
/* counter.h */
struct counter {
    int value;   /* layout is part of the ABI now */
};

int counter_get(const struct counter *c);
```

## Good

```c
/* counter.h */
typedef struct counter counter;   /* opaque: layout lives in counter.c */

int counter_get(const counter *c);
```

## See Also

- [c-anti-typedef-struct-pointer](anti-typedef-struct-pointer.md) - the exception that makes opaque typedefs acceptable
- [c-pat-init-destroy](pat-init-destroy.md) - the lifecycle functions such a type needs
