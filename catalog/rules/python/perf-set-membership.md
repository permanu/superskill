---
id: python-perf-set-membership
lang: python
prefix: perf
title: Use a set or dict for membership tests instead of scanning a list
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [set, membership, in, lookup]
  files: ["**/*.py"]
  symbols: [set, frozenset]
related: [python-perf-defaultdict-count]
sources:
  - title: Python Tutorial - Sets
    url: https://docs.python.org/3/tutorial/datastructures.html
---

> Use a set or dict for membership tests, not a list scan.

## Why

Membership in a list checks elements one by one, so a filter over two large collections is quadratic. Sets and dicts hash their keys, making the same check constant time on average. The tutorial lists membership testing as a basic use of sets; build the set once before the loop.

## Bad

```python
def missing(required: list[str], provided: list[str]) -> list[str]:
    return [name for name in required if name not in provided]
```

## Good

```python
def missing(required: list[str], provided: list[str]) -> list[str]:
    available = set(provided)
    return [name for name in required if name not in available]
```

## See Also

- [python-perf-defaultdict-count](perf-defaultdict-count.md) - the same hashing advantage for counting
