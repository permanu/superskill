---
id: c-const-pointer-fixed
lang: c
prefix: const
title: Const-qualify the pointer itself when the address must not change
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const pointer, address, fixed binding, qualifier]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-ptr-const-params, c-const-local-readonly]
sources:
  - title: cppreference - const type qualifier
    url: https://en.cppreference.com/w/c/language/const
---
> Write `T *const p` when the binding is fixed; the pointed-to object stays writable.

## Why

cppreference shows the two independent placements: `const int *pc` protects the pointed-to int, while `int *const cp` protects the pointer itself, so `cp` cannot be assigned but `*cp` can. A global or member pointer that must always refer to one object is exactly the second case; leaving it unqualified lets any later statement rebind it. The qualifier turns "this never changes" into a compile-time check.

## Bad

```c
static int value;
static int *current = &value;   /* the pointer can be reassigned anywhere */

int current_value(void) {
    return *current;
}
```

## Good

```c
static int value;
static int *const current = &value;   /* fixed address, writable object */

int current_value(void) {
    return *current;
}
```

## See Also

- [c-ptr-const-params](ptr-const-params.md) - the pointee-side qualifier for parameters
- [c-const-local-readonly](const-local-readonly.md) - the same idea for locals
