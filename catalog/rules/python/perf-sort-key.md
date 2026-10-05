---
id: python-perf-sort-key
lang: python
prefix: perf
title: Sort with a key function so it is called once per element
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sort, key, itemgetter, comparison]
  files: ["**/*.py"]
  symbols: [sorted, itemgetter]
related: [python-perf-partial-sort]
sources:
  - title: Sorting Techniques - Key Functions
    url: https://docs.python.org/3/howto/sorting.html
---

> Sort with a key function so it is called once per element.

## Why

The key function is called exactly once per record, and the sort compares the precomputed keys; a comparison function is called repeatedly during sorting. The howto calls the key technique fast for that reason and recommends `operator.itemgetter` and `attrgetter` over hand-written accessors. Reach for `functools.cmp_to_key` only when an external API supplies a comparison function.

## Bad

```python
import functools


def compare(left: tuple[str, int], right: tuple[str, int]) -> int:
    return (left[1] > right[1]) - (left[1] < right[1])


def by_age(people: list[tuple[str, int]]) -> list[tuple[str, int]]:
    return sorted(people, key=functools.cmp_to_key(compare))
```

## Good

```python
from operator import itemgetter


def by_age(people: list[tuple[str, int]]) -> list[tuple[str, int]]:
    return sorted(people, key=itemgetter(1))
```

## See Also

- [python-perf-partial-sort](perf-partial-sort.md) - avoiding the sort entirely for a top-n selection
