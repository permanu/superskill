---
id: c-doc-what-not-how
lang: c
prefix: doc
title: Write comments about intent, not about the mechanics of the code
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, intent, maintainability, why]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-contract, c-doc-data-comments]
sources:
  - title: Linux kernel coding style - Commenting
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Explain why the code exists and what invariant it protects; let the code show how it works.

## Why

A comment that narrates the statements duplicates what the reader can already see and goes stale the moment the statements change. The information only the author has is intent: why this approach, which invariant must hold, what would break otherwise. Kernel style asks for the why at the head of the function and leaves the how to readable code.

## Bad

```c
#include <stddef.h>

struct node {
    struct node *next;
};

int depth(struct node *n) {
    /* loop over nodes and increment counter while next is non-null */
    int d = 0;
    while (n != NULL) {
        ++d;
        n = n->next;
    }
    return d;
}
```

## Good

```c
#include <stddef.h>

struct node {
    struct node *next;
};

int depth(struct node *n) {
    /* Counts the nodes before the list terminates; used for cycle diagnostics. */
    int d = 0;
    while (n != NULL) {
        ++d;
        n = n->next;
    }
    return d;
}
```

## See Also

- [c-doc-contract](doc-contract.md) - the contract information callers actually need
- [c-doc-data-comments](doc-data-comments.md) - the same rule applied to data
