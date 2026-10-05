---
id: python-type-self-return
lang: python
prefix: type
title: Annotate instance-returning methods with Self instead of the class name
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Self, fluent, classmethod, subclass]
  files: ["**/*.py"]
  symbols: [Self]
related: [python-type-annotate-signatures]
sources:
  - title: typing - Self
    url: https://docs.python.org/3/library/typing.html
---

> Annotate fluent and alternative-constructor returns with Self, not the class name.

## Why

`Self` tracks the actual subclass, so chaining on a subclass keeps its type instead of collapsing to the base class. It applies to fluent methods, classmethod constructors, and `__enter__` implementations. Naming the base class in those positions silently widens the type for every subclass.

## Bad

```python
class Query:
    def where(self, clause: str) -> "Query":
        self.clause = clause
        return self
```

## Good

```python
from typing import Self


class Query:
    def where(self, clause: str) -> Self:
        self.clause = clause
        return self
```

## See Also

- [python-type-annotate-signatures](type-annotate-signatures.md) - the annotation discipline Self extends to inheritance
