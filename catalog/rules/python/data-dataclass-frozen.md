---
id: python-data-dataclass-frozen
lang: python
prefix: data
title: Mark value objects as frozen dataclasses so they are immutable and hashable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [frozen, dataclass, immutable, hashable]
  files: ["**/*.py"]
  symbols: [FrozenInstanceError]
related: [python-data-dataclass-records]
sources:
  - title: dataclasses - Frozen instances
    url: https://docs.python.org/3/library/dataclasses.html
---

> Make value objects frozen dataclasses; frozen records are immutable and hashable.

## Why

`frozen=True` adds `__setattr__` and `__delattr__` that raise `FrozenInstanceError`, emulating immutability, and it generates `__hash__` for the class. Immutable records cannot be mutated through a shared reference, and their hash makes them usable as dict keys or set members. Mutation then becomes an explicit `replace` call that produces a new value.

## Bad

```python
from dataclasses import dataclass


@dataclass
class Point:
    x: int
    y: int


def origin() -> Point:
    point = Point(0, 0)
    point.x = 1
    return point
```

## Good

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Point:
    x: int
    y: int


def moved(point: Point) -> Point:
    return replace(point, x=1)
```

## See Also

- [python-data-dataclass-records](data-dataclass-records.md) - the record declaration this qualifier applies to
