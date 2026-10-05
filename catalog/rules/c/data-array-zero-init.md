---
id: c-data-array-zero-init
lang: c
prefix: data
title: Zero-initialize whole arrays with an empty or partial initializer
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [array initialization, zero, indeterminate, aggregate]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-mem-zero-init, c-data-static-const-table]
sources:
  - title: cppreference - Initialization
    url: https://en.cppreference.com/w/c/language/initialization
---
> Write `= {0}` or `= {}` so every element starts defined; an uninitialized array is indeterminate.

## Why

The initialization rules fill omitted aggregate elements with zero when an initializer is present, so `int table[8] = {0};` defines all eight elements. An automatic array with no initializer leaves every element indeterminate and reading one is undefined behavior, while static storage happens to be zeroed by the language — which is why the distinction matters at block scope. The empty initializer states "all zero" directly.

## Bad

```c
int first(void) {
    int table[8];   /* automatic storage: indeterminate until written */
    return table[0];   /* reads an indeterminate value */
}
```

## Good

```c
int first(void) {
    int table[8] = {0};   /* the whole array is zero-initialized */
    return table[0];
}
```

## See Also

- [c-mem-zero-init](mem-zero-init.md) - the same rule for struct members
- [c-data-static-const-table](data-static-const-table.md) - tables that are never written
