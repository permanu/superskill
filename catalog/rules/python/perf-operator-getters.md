---
id: python-perf-operator-getters
lang: python
prefix: perf
title: Extract fields with operator.itemgetter and attrgetter
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [itemgetter, attrgetter, operator, key function]
  files: ["**/*.py"]
  symbols: [operator.itemgetter, operator.attrgetter]
related: [python-perf-sort-key, python-const-regex-compile]
sources:
  - title: operator - Standard operators as functions
    url: https://docs.python.org/3/library/operator.html
---

> Extract fields with itemgetter and attrgetter; they are the module's fast field extractors.

## Why

The operator docs describe attrgetter and itemgetter as tools for generalized attribute and item lookups and state that they are useful for making fast field extractors as arguments for map(), sorted(), itertools.groupby(), or other functions that expect a function argument. The functions are efficient primitives rather than Python-level lambdas. Naming one as a constant also documents the field being extracted.

## Bad

```python
def names(people: list[tuple[str, int]]) -> list[str]:
    return [person[0] for person in people]
```

## Good

```python
from operator import itemgetter


def names(people: list[tuple[str, int]]) -> list[str]:
    return list(map(itemgetter(0), people))
```

## See Also

- [python-perf-sort-key](perf-sort-key.md) - the key-function rule these extractors feed
- [python-const-regex-compile](const-regex-compile.md) - another module-level tool for repeated work
