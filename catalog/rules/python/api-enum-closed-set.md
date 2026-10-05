---
id: python-api-enum-closed-set
lang: python
prefix: api
title: Model closed sets with Enum members, not bare strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, constants, closed set, api]
  files: ["**/*.py"]
  symbols: [enum.Enum]
related: [python-api-bool-params, python-anti-mutable-class-attribute]
sources:
  - title: enum - Support for enumerations
    url: https://docs.python.org/3/library/enum.html
---

> Model closed sets with Enum members; bare strings accept typos the code never handled.

## Why

The enum docs define an enumeration as a set of symbolic names bound to unique values, iterable in definition order, with call syntax for lookup by value. A string parameter accepts any value at runtime, and only the code that branches on it knows the real set. An Enum makes the set a type, so members are listed, checked, and displayed by name.

## Bad

```python
def render(align: str) -> None:
    if align == "left" or align == "right":
        print(align)
    else:
        raise ValueError(f"unknown alignment: {align}")
```

## Good

```python
from enum import Enum


class Align(Enum):
    LEFT = "left"
    RIGHT = "right"


def render(align: Align) -> None:
    print(align.value)
```

## See Also

- [python-api-bool-params](api-bool-params.md) - the two-state flag that becomes an enum when it grows
- [python-anti-mutable-class-attribute](anti-mutable-class-attribute.md) - keeping shared state out of the class body
