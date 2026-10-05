---
id: c-pat-dispatch-table
lang: c
prefix: pat
title: Replace operation switches with a static table of function pointers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dispatch table, function pointer, switch, registry]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-pat-vtable, c-anti-function-macro]
sources:
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
---
> Store operations in a static array indexed by the operation code and dispatch through it.

## Why

Function pointers can be stored in arrays and copied, so a table indexed by operation code replaces the switch that every operation must otherwise edit. Adding an operation becomes one table entry, and the table documents the full set in one place. A bounds check around the index turns an unknown code into a handled case instead of a fall-through.

## Bad

```c
typedef int (*op_fn)(int, int);

static int op_add(int a, int b) { return a + b; }
static int op_sub(int a, int b) { return a - b; }

int apply(int op, int a, int b) {
    switch (op) {
    case 0:
        return op_add(a, b);
    case 1:
        return op_sub(a, b);
    default:
        return 0;   /* every new op edits the switch */
    }
}
```

## Good

```c
#include <stddef.h>

typedef int (*op_fn)(int, int);

static int op_add(int a, int b) { return a + b; }
static int op_sub(int a, int b) { return a - b; }

static const struct {
    op_fn fn;
} ops[] = {
    { op_add },
    { op_sub },
};

int apply(int op, int a, int b) {
    size_t n = sizeof ops / sizeof ops[0];
    if (op < 0 || (size_t)op >= n) {
        return 0;
    }
    return ops[op].fn(a, b);   /* adding an op is one table entry */
}
```

## See Also

- [c-pat-vtable](pat-vtable.md) - the per-object form of the same idea
- [c-anti-function-macro](anti-function-macro.md) - why these helpers are functions, not macros
