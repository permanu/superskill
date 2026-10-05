---
id: python-perf-bisect-search
lang: python
prefix: perf
title: Search sorted sequences with bisect, not a linear scan
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bisect, sorted, search, performance]
  files: ["**/*.py"]
  symbols: [bisect.bisect_left]
related: [python-perf-set-membership, python-perf-partial-sort]
sources:
  - title: bisect - Array bisection algorithm
    url: https://docs.python.org/3/library/bisect.html
---

> Locate values in a sorted list with bisect; a linear scan rechecks every element.

## Why

The bisect docs state that the module uses a basic bisection algorithm to locate insertion points and that it improves on linear searches for long lists with expensive comparisons. The Searching Sorted Lists section shows the index() recipe built from bisect_left, checking the candidate position before reporting it. When the list is already sorted, the logarithmic lookup is free to use.

## Bad

```python
def index_of(values: list[int], target: int) -> int:
    for index, value in enumerate(values):
        if value == target:
            return index
    return -1
```

## Good

```python
from bisect import bisect_left


def index_of(values: list[int], target: int) -> int:
    index = bisect_left(values, target)
    if index < len(values) and values[index] == target:
        return index
    return -1
```

## See Also

- [python-perf-set-membership](perf-set-membership.md) - hash lookup when order does not matter
- [python-perf-partial-sort](perf-partial-sort.md) - avoiding a full sort when a selection suffices
