---
id: python-data-dataclass-records
lang: python
prefix: data
title: Model structured records as dataclasses instead of dicts or bare tuples
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dataclass, record, dict, tuple]
  files: ["**/*.py"]
  symbols: [dataclass]
related: [python-data-dataclass-frozen, python-type-typeddict-boundary]
sources:
  - title: dataclasses - Data Classes
    url: https://docs.python.org/3/library/dataclasses.html
---

> Model records as dataclasses; dict keys and tuple positions fail silently.

## Why

A dataclass names each field in the class and generates `__init__`, `__repr__`, and `__eq__` from those names, so callers get attribute access and readable failures. A dict typo raises `KeyError` only on the failing path, and a swapped tuple position changes meaning without any error. The dataclass declaration is also where the field types live for the checker.

## Bad

```python
def parse_row(row: tuple[str, int, bool]) -> dict[str, object]:
    return {"name": row[0], "age": row[1], "active": row[2]}
```

## Good

```python
from dataclasses import dataclass


@dataclass
class User:
    name: str
    age: int
    active: bool


def parse_row(row: tuple[str, int, bool]) -> User:
    return User(name=row[0], age=row[1], active=row[2])
```

## See Also

- [python-data-dataclass-frozen](data-dataclass-frozen.md) - making those records immutable value objects
- [python-type-typeddict-boundary](type-typeddict-boundary.md) - when the record is a loose mapping at the boundary
