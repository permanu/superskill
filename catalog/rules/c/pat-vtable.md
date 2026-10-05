---
id: c-pat-vtable
lang: c
prefix: pat
title: Model a polymorphic interface as a struct of function pointers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [vtable, function pointer, interface, dispatch]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-pat-dispatch-table, c-pat-callback-context]
sources:
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
---
> Give each implementation a table of operations and call through the table instead of switching on a type tag.

## Why

Function pointers are objects that can be stored in structs and passed around, which is exactly what an interface needs. A tag plus a switch inside every operation spreads knowledge of all implementations across the code and requires editing each switch when one is added. A table of operations keeps each type's behavior in one place and lets new types register their own.

## Bad

```c
struct shape {
    int kind;   /* 0 = circle, 1 = square */
    double a;
};

double shape_area(const struct shape *s) {
    if (s->kind == 0) {
        return 3.14159 * s->a * s->a;
    }
    return s->a * s->a;   /* every new shape edits this function */
}
```

## Good

```c
struct shape {
    double (*area)(const struct shape *self);   /* one operation per type */
    double a;
};

double shape_area(const struct shape *s) {
    return s->area(s);   /* dispatch belongs to the object */
}
```

## See Also

- [c-pat-dispatch-table](pat-dispatch-table.md) - the table form when the operation is chosen by index
- [c-pat-callback-context](pat-callback-context.md) - carrying state into these calls
