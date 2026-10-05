---
id: python-perf-set-dedup
lang: python
prefix: perf
title: Deduplicate sequences with set or dict.fromkeys, not nested scans
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deduplicate, set, unique, performance]
  files: ["**/*.py"]
  symbols: [set, dict.fromkeys]
related: [python-perf-set-membership, python-perf-defaultdict-count]
sources:
  - title: The Python Tutorial - Data Structures
    url: https://docs.python.org/3/tutorial/datastructures.html
---

> Deduplicate with set or dict.fromkeys; the membership-check loop is quadratic.

## Why

The data structures tutorial states that a set is an unordered collection with no duplicate elements and that basic uses include membership testing and eliminating duplicate entries, and its looping section shows sorted(set(basket)) as the idiomatic unique traversal. The manual loop checks the growing result with a linear scan per element, which is quadratic on long inputs. The container does the same work with hashing.

## Bad

```python
def unique(values: list[str]) -> list[str]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result
```

## Good

```python
def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
```

## See Also

- [python-perf-set-membership](perf-set-membership.md) - the membership-test version of this choice
- [python-perf-defaultdict-count](perf-defaultdict-count.md) - the counting version of the same container-first approach
