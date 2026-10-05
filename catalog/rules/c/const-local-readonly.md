---
id: c-const-local-readonly
lang: c
prefix: const
title: Qualify locals that are computed once and never reassigned
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const local, immutability, initialization]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-const-pointer-fixed, c-mem-zero-init]
sources:
  - title: cppreference - const type qualifier
    url: https://en.cppreference.com/w/c/language/const
---
> Mark the result of a one-time computation const so later statements cannot change it.

## Why

A local that is assigned once and then read many times is a small invariant, and `const` makes it one: the compiler rejects any later assignment, so the invariant cannot be broken by a later edit. cppreference notes that const objects may be placed in read-only storage and that modification attempts are undefined behavior, so the qualifier also documents intent to readers. The pattern is free at run time.

## Bad

```c
int scale(int base, int factor) {
    int scaled = base * factor;
    scaled = scaled + 0;   /* reassigned although the value was final */
    return scaled;
}
```

## Good

```c
int scale(int base, int factor) {
    const int scaled = base * factor;   /* computed once, checked by the compiler */
    return scaled;
}
```

## See Also

- [c-const-pointer-fixed](const-pointer-fixed.md) - the pointer variant of the same rule
- [c-mem-zero-init](mem-zero-init.md) - giving locals defined values in the first place
