---
id: python-anti-mutable-class-attribute
lang: python
prefix: anti
title: Do not put mutable containers on the class; they are shared by every instance
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [class variable, shared state, mutable, bug]
  files: ["**/*.py"]
  symbols: [__init__]
related: [python-anti-mutable-default, python-data-dataclass-records]
sources:
  - title: The Python Tutorial - Classes
    url: https://docs.python.org/3/tutorial/classes.html
---

> Do not put mutable containers on the class; class attributes are shared by every instance.

## Why

The classes tutorial explains that instance variables are for data unique to each instance and class variables are for attributes shared by all instances, and calls the tricks list a mistaken use of a class variable because a single list would be shared by all Dog instances. Appends through one instance are then visible through every other instance. Initializing the container in __init__ gives each instance its own.

## Bad

```python
class Cart:
    items: list[str] = []

    def add(self, item: str) -> None:
        self.items.append(item)
```

## Good

```python
class Cart:
    def __init__(self) -> None:
        self.items: list[str] = []

    def add(self, item: str) -> None:
        self.items.append(item)
```

## See Also

- [python-anti-mutable-default](anti-mutable-default.md) - the same shared-object problem in function defaults
- [python-data-dataclass-records](data-dataclass-records.md) - modeling records so per-instance state is explicit
