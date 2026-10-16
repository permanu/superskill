---
id: c-doc-data-comments
lang: c
prefix: doc
title: Document data invariants that names and types cannot express
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
  - title: Google Engineering Practices - Comments
    url: https://google.github.io/eng-practices/review/reviewer/looking-for.html
  - title: Linux kernel coding style - Commenting
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Use descriptive field names and document non-obvious data invariants instead of repeating each declaration in prose.

## Why

Names can carry units and roles, while allocation, lifetime and layout invariants can require a real comment. Linux kernel style explicitly emphasizes data documentation; apply required project conventions without turning that advice into redundant prose for every field in every C project. Keep each declaration readable and reserve commentary for information a caller would otherwise have to guess.

## Bad

```c
#include <stddef.h>

struct text_buffer {
    char *data;
    size_t capacity_bytes;
};
```

## Good

```c
#include <stddef.h>

struct text_buffer {
    char *data;
    /* Allocated bytes at data; at least one, with one reserved for the trailing NUL. */
    size_t capacity_bytes;
};
```

## See Also

- [c-doc-what-not-how](doc-what-not-how.md) - comments that carry intent instead of restating types
- [c-doc-contract](doc-contract.md) - documenting behavior, not only data
