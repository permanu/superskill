---
id: c-doc-data-comments
lang: c
prefix: doc
title: Declare one object per line and comment what each one holds
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [struct fields, data comments, one per line]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-what-not-how, c-doc-contract]
sources:
  - title: Linux kernel coding style - Commenting
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Give each member and file-scope object its own declaration line with a comment describing its content.

## Why

Types say `int`, but not whether it is bytes or elements, milliseconds or seconds, signed for a reason or by accident. One declaration per line leaves room for that comment and makes the diff clean when a member changes. Kernel style asks for exactly this: comment data, one declaration per line.

## Bad

```c
#include <stddef.h>

struct limits { int min; int max; size_t bytes; };
```

## Good

```c
#include <stddef.h>

struct limits {
    int min;      /* smallest accepted value */
    int max;      /* largest accepted value */
    size_t bytes; /* size of the backing buffer in bytes */
};
```

## See Also

- [c-doc-what-not-how](doc-what-not-how.md) - comments that carry intent instead of restating types
- [c-doc-contract](doc-contract.md) - documenting behavior, not only data
