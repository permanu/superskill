---
id: c-pat-designated-init
lang: c
prefix: pat
title: Initialize configuration structs with designated initializers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [designated initializer, struct, config, initialization]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-data-comments, c-mem-zero-init]
sources:
  - title: cppreference - Initialization
    url: https://en.cppreference.com/w/c/language/initialization
---
> Name each field in the initializer so reordering a struct cannot silently change values.

## Why

A positional initializer is a promise that the field order will never change; the day a field is inserted or reordered, every positional initializer assigns the wrong values and the compiler stays silent where types match. Designators bind values to names, so the code survives layout changes, and unmentioned fields are zero-initialized by the aggregate rules. The initializer also documents what the configuration means.

## Bad

```c
struct config {
    int retries;
    int timeout_ms;
    int verbose;
};

struct config make_config(void) {
    struct config c = {3, 1000, 0};   /* positional: reordering changes meaning */
    return c;
}
```

## Good

```c
struct config {
    int retries;
    int timeout_ms;
    int verbose;
};

struct config make_config(void) {
    struct config c = {
        .retries = 3,
        .timeout_ms = 1000,
        .verbose = 0,   /* designators survive reordering */
    };
    return c;
}
```

## See Also

- [c-doc-data-comments](doc-data-comments.md) - documenting each field's role
- [c-mem-zero-init](mem-zero-init.md) - the defined values this leaves for omitted fields
