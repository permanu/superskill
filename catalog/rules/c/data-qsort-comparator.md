---
id: c-data-qsort-comparator
lang: c
prefix: data
title: Give qsort a total-order comparator without arithmetic overflow
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [qsort, comparator, total order, overflow]
  files: ["**/*.c", "**/*.h"]
  symbols: [qsort]
related: [c-data-qsort-stability, c-data-bsearch-sorted]
sources:
  - title: cppreference - qsort
    url: https://en.cppreference.com/w/c/algorithm/qsort
---
> Return the sign of the comparison with a relational test, not a subtraction.

## Why

`qsort` requires the comparator to induce a consistent ordering; cppreference documents that equivalent elements end up in an unspecified order and that the comparator receives pointers to elements. Returning `a - b` overflows for values far apart, which can flip the sign and break the ordering, and the sort then behaves unpredictably. `(x > y) - (x < y)` yields -1, 0, or 1 for every input.

## Bad

```c
#include <stdlib.h>

int compare_ints(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;   /* overflow breaks the order */
}
```

## Good

```c
int compare_ints(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);   /* a total order without overflow */
}
```

## See Also

- [c-data-qsort-stability](data-qsort-stability.md) - what happens to equal elements
- [c-data-bsearch-sorted](data-bsearch-sorted.md) - the same comparator is needed to search
