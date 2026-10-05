---
id: python-data-dataclass-slots
lang: python
prefix: data
title: Use slots on dataclasses that exist in large numbers
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slots, dataclass, memory, records]
  files: ["**/*.py"]
  symbols: [__slots__]
related: [python-data-dataclass-records]
sources:
  - title: dataclasses - slots parameter
    url: https://docs.python.org/3/library/dataclasses.html
---

> Give high-volume dataclasses slots=True to drop per-instance dictionaries.

## Why

`slots=True` generates `__slots__` for the class and returns a new class without a per-instance `__dict__`, so each record carries only its field storage. For records created in bulk this removes a dictionary per object and makes attribute access direct. The tradeoff is no dynamic attributes, which fixed records do not need.

## Bad

```python
from dataclasses import dataclass


@dataclass
class Reading:
    sensor: str
    value: float
```

## Good

```python
from dataclasses import dataclass


@dataclass(slots=True)
class Reading:
    sensor: str
    value: float
```

## See Also

- [python-data-dataclass-records](data-dataclass-records.md) - the record style this tunes
