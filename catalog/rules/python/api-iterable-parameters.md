---
id: python-api-iterable-parameters
lang: python
prefix: api
title: Type parameters as the abstract interface they use
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Iterable, parameters, annotations, api]
  files: ["**/*.py"]
  symbols: [collections.abc.Iterable]
related: [python-type-builtin-generics, python-api-abc-interface]
sources:
  - title: collections.abc - Abstract Base Classes for Containers
    url: https://docs.python.org/3/library/collections.abc.html
---

> Type parameters as the abstract interface they use; list annotations reject tuples and generators.

## Why

The collections.abc docs present the module as abstract base classes used to express whether a class provides a particular interface, such as Iterable or Mapping. A parameter annotated list[int] claims a concrete container even when the body only iterates, so tuples and generators are rejected by checkers although the code works. The abstract interface states exactly what the function requires.

## Bad

```python
def total(values: list[int]) -> int:
    return sum(values)
```

## Good

```python
from collections.abc import Iterable


def total(values: Iterable[int]) -> int:
    return sum(values)
```

## See Also

- [python-type-builtin-generics](type-builtin-generics.md) - the subscript syntax used in these annotations
- [python-api-abc-interface](api-abc-interface.md) - declaring custom interfaces the same way
