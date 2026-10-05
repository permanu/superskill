---
id: c-data-bsearch-sorted
lang: c
prefix: data
title: Search with bsearch only the array sorted by the same comparator
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bsearch, sorted, comparator, partition]
  files: ["**/*.c", "**/*.h"]
  symbols: [bsearch, qsort]
related: [c-data-qsort-comparator, c-data-qsort-stability]
sources:
  - title: cppreference - bsearch
    url: https://en.cppreference.com/w/c/algorithm/bsearch
---
> The array must be partitioned by the same criterion the search comparator uses, or the behavior is undefined.

## Why

cppreference states that `bsearch` requires the array to be partitioned with respect to the key according to the same comparison the search uses, and that the behavior is undefined otherwise. Sorting with one comparator and searching with another silently searches the wrong order and returns wrong answers or null. Sort and search must share one comparator.

## Bad

```c
#include <stddef.h>
#include <stdlib.h>

int by_value(const void *a, const void *b);
int by_index(const void *a, const void *b);

int *find_value(int *values, size_t n, int key) {
    qsort(values, n, sizeof *values, by_index);
    return bsearch(&key, values, n, sizeof *values, by_value);   /* different order */
}
```

## Good

```c
#include <stddef.h>
#include <stdlib.h>

int by_value(const void *a, const void *b);

int *find_value(int *values, size_t n, int key) {
    qsort(values, n, sizeof *values, by_value);
    return bsearch(&key, values, n, sizeof *values, by_value);   /* same criterion */
}
```

## See Also

- [c-data-qsort-comparator](data-qsort-comparator.md) - the comparator both operations share
- [c-data-qsort-stability](data-qsort-stability.md) - ordering the elements the search relies on
