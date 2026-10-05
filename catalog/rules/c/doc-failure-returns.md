---
id: c-doc-failure-returns
lang: c
prefix: doc
title: Document every failure return value explicitly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [return value, failure, errno, documentation]
  files: ["**/*.h"]
  symbols: []
related: [c-doc-contract, c-err-status-return]
sources:
  - title: Linux kernel coding style - Function return values and names
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> State the exact value returned on failure and what it means, next to the success case.

## Why

"Returns the number of bytes read" hides the failure path: a caller cannot know whether -1 is possible, whether errno is set, or whether a short count means end-of-file. Kernel style separates error-code returns from predicate returns precisely because mixing them causes bugs. Naming both outcomes in the comment lets callers handle failure correctly.

## Bad

```c
#include <stddef.h>

/* Returns the number of bytes read. */
int read_chunk(int fd, void *buf, size_t n);
```

## Good

```c
#include <stddef.h>

/* Returns bytes read (0 at end of file),
 * or -1 with errno set on failure. */
int read_chunk(int fd, void *buf, size_t n);
```

## See Also

- [c-doc-contract](doc-contract.md) - the full contract around this return value
- [c-err-status-return](err-status-return.md) - the convention this documentation describes
