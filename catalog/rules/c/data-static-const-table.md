---
id: c-data-static-const-table
lang: c
prefix: data
title: Put lookup tables in static const storage
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lookup table, const, read-only, static]
  files: ["**/*.c", "**/*.h"]
  symbols: [const]
related: [c-data-array-zero-init, c-pat-array-size]
sources:
  - title: cppreference - const type qualifier
    url: https://en.cppreference.com/w/c/language/const
---
> Declare tables that are never modified `static const` so they can live in read-only memory.

## Why

cppreference notes that objects declared with const-qualified types may be placed in read-only memory, and an attempt to modify them is undefined behavior. A writable table in the data segment costs a page that must be dirty and invites accidental modification; `static const` moves it to read-only storage and makes the immutability a checkable property. Returning a pointer to it should preserve the qualifier.

## Bad

```c
int *mode_ids(void) {
    static int ids[4] = {1, 2, 3, 4};   /* writable shared state */
    return ids;
}
```

## Good

```c
const int *mode_ids(void) {
    static const int ids[4] = {1, 2, 3, 4};   /* read-only table */
    return ids;
}
```

## See Also

- [c-data-array-zero-init](data-array-zero-init.md) - initializing such tables
- [c-pat-array-size](pat-array-size.md) - iterating them safely
