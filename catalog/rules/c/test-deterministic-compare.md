---
id: c-test-deterministic-compare
lang: c
prefix: test
title: Give test comparisons a total order so results are deterministic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [qsort, test flake, tie-breaker, comparison]
  files: ["**/*.c"]
  symbols: [qsort, memcmp]
related: [c-data-qsort-stability, c-test-seed-prng]
sources:
  - title: cppreference - qsort
    url: https://en.cppreference.com/w/c/algorithm/qsort
---
> Break ties in the comparator before comparing sorted results; equal elements come out in unspecified order.

## Why

cppreference states that if the comparator reports two elements as equivalent, their order in the sorted result is unspecified, so two sorts of the same multiset can order equal elements differently. A test that compares sorted arrays byte by byte then fails intermittently with no code change. A comparator that compares a unique tie-breaker makes both orders identical.

## Bad

```c
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

int compare_ints(const void *a, const void *b);

int compare_results(int *got, int *expected, size_t n) {
    qsort(got, n, sizeof *got, compare_ints);
    qsort(expected, n, sizeof *expected, compare_ints);
    return memcmp(got, expected, n * sizeof *got) == 0;
    /* equal elements may be ordered differently: the test flakes */
}
```

## Good

```c
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

int compare_total(const void *a, const void *b);   /* breaks ties */

int compare_results(int *got, int *expected, size_t n) {
    qsort(got, n, sizeof *got, compare_total);
    qsort(expected, n, sizeof *expected, compare_total);
    return memcmp(got, expected, n * sizeof *got) == 0;   /* total order: deterministic */
}
```

## See Also

- [c-data-qsort-stability](data-qsort-stability.md) - the tie-breaker in the comparator
- [c-test-seed-prng](test-seed-prng.md) - the other source of irreproducible tests
