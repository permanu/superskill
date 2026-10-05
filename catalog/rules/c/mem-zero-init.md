---
id: c-mem-zero-init
lang: c
prefix: mem
title: Write every object before its first read
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [uninitialized, indeterminate, struct, initialization]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-mem-use-after-free, c-err-partial-cleanup]
sources:
  - title: SEI CERT C - EXP33-C, do not read uninitialized memory
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp33-c/
---
> Define objects in initialized form and fill every field before any read or return.

## Why

Automatic objects and fresh `malloc` storage hold indeterminate values; reading them is undefined behavior and on the stack they can carry remnants of unrelated data. A partially filled struct returned to a caller exports those remnants as if they were data. Initializers and complete assignment give every byte a defined value before it can be observed.

## Bad

```c
struct config {
    int mode;
    int retries;
};

struct config make_config(void) {
    struct config c;
    c.mode = 1;
    return c;              /* retries is indeterminate */
}
```

## Good

```c
struct config {
    int mode;
    int retries;
};

struct config make_config(void) {
    struct config c = { .mode = 1, .retries = 0 };   /* every field set */
    return c;
}
```

## See Also

- [c-mem-use-after-free](mem-use-after-free.md) - the other way storage becomes invalid
- [c-err-partial-cleanup](err-partial-cleanup.md) - initializing so cleanup paths are safe
