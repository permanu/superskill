---
id: c-doc-static-assert
lang: c
prefix: doc
title: Document layout and size assumptions with static_assert
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static_assert, layout, assumptions, compile time]
  files: ["**/*.c", "**/*.h"]
  symbols: [static_assert]
related: [c-conv-fixed-width, c-doc-contract]
sources:
  - title: cppreference - static_assert
    url: https://en.cppreference.com/w/c/error/static_assert
---
> Encode each compile-time assumption as a `static_assert` with a message, next to the declaration it protects.

## Why

Assumptions about struct size, field alignment, or integer width live in comments until someone changes a field and breaks the wire format silently. `static_assert` turns the assumption into a build failure with the author's message, and it documents the intent at the same place. The check costs nothing at run time.

## Bad

```c
struct header {
    unsigned char tag;
    unsigned int length;
};
/* size is assumed to be 8 bytes by the wire format */
```

## Good

```c
struct header {
    unsigned char tag;
    unsigned int length;
};
static_assert(sizeof(struct header) == 8,
              "header layout changed: update the wire format");
```

## See Also

- [c-conv-fixed-width](conv-fixed-width.md) - the fixed widths these assertions protect
- [c-doc-contract](doc-contract.md) - documenting the runtime contract around the same type
