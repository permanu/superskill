---
id: c-data-qsort-stability
lang: c
prefix: data
title: Add a tie-breaker when the order of equal elements matters
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [qsort, stability, tie-breaker, equal elements]
  files: ["**/*.c", "**/*.h"]
  symbols: [qsort]
related: [c-data-qsort-comparator, c-data-bsearch-sorted]
sources:
  - title: cppreference - qsort
    url: https://en.cppreference.com/w/c/algorithm/qsort
---
> Make the comparator a strict total order; qsort leaves equivalent elements in unspecified order.

## Why

cppreference states that if the comparator reports two elements as equivalent, their order in the result is unspecified. A sort by one field therefore shuffles records that share that field, and the output changes between runs and implementations. Comparing a second field, such as a unique identifier, when the first is equal gives one defined order.

## Bad

```c
#include <stdlib.h>

struct entry {
    int rank;
    int id;
};

int compare_rank(const void *a, const void *b) {
    const struct entry *x = a;
    const struct entry *y = b;
    return (x->rank > y->rank) - (x->rank < y->rank);   /* ties are unspecified */
}
```

## Good

```c
struct entry {
    int rank;
    int id;
};

int compare_rank(const void *a, const void *b) {
    const struct entry *x = a;
    const struct entry *y = b;
    if (x->rank != y->rank) {
        return (x->rank > y->rank) - (x->rank < y->rank);
    }
    return (x->id > y->id) - (x->id < y->id);   /* tie-breaker makes it total */
}
```

## See Also

- [c-data-qsort-comparator](data-qsort-comparator.md) - writing the comparison safely
- [c-data-bsearch-sorted](data-bsearch-sorted.md) - searching the result consistently
