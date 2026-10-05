---
id: python-type-typevar-bound
lang: python
prefix: type
title: Bound type variables to the interface the body uses
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TypeVar, bound, generics, typing]
  files: ["**/*.py"]
  symbols: [typing.TypeVar]
related: [python-type-generic-syntax, python-type-protocol-interface]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Bound type variables to the interface the body uses; an unbound T permits no attribute access.

## Why

The typing docs state that TypeVar accepts a bound argument, show S = TypeVar('S', bound=str) as a variable that can be any subtype of str, and present the PEP 695 form class StrSequence[S: str] for the same constraint. A bound is what lets the generic body call methods of the constrained interface with checker approval. Without one, the variable stands for any type and the body cannot use it meaningfully.

## Bad

```python
from typing import TypeVar

T = TypeVar("T")


def name_of(value: T) -> str:
    return value.name
```

## Good

```python
from typing import TypeVar


class Named:
    name: str


T = TypeVar("T", bound=Named)


def name_of(value: T) -> str:
    return value.name
```

## See Also

- [python-type-generic-syntax](type-generic-syntax.md) - the PEP 695 bound syntax for the same constraint
- [python-type-protocol-interface](type-protocol-interface.md) - structural interfaces usable as bounds
