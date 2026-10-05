---
id: python-type-generic-syntax
lang: python
prefix: type
title: Declare generic functions and classes with the bracketed type parameter syntax
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generics, TypeVar, Generic, type parameter]
  files: ["**/*.py"]
  symbols: [TypeVar, Generic]
related: [python-type-avoid-any, python-type-alias-statement]
sources:
  - title: PEP 695 - Type Parameter Syntax
    url: https://peps.python.org/pep-0695/
  - title: typing - Generics
    url: https://docs.python.org/3/library/typing.html
---

> Declare generic functions and classes with the bracketed type parameter syntax.

## Why

The bracketed syntax puts parameters where the declaration is read, scopes them to that declaration, and infers variance instead of requiring `covariant` and `contravariant` flags. It also removes the module-level `TypeVar` names that leak across unrelated generics. The `TypeVar` and `Generic` spellings remain for compatibility but receive no new capabilities.

## Bad

```python
from typing import TypeVar

T = TypeVar("T")


def first(values: list[T]) -> T:
    return values[0]
```

## Good

```python
def first[T](values: list[T]) -> T:
    return values[0]
```

## See Also

- [python-type-avoid-any](type-avoid-any.md) - the erasure problem a type parameter solves
- [python-type-alias-statement](type-alias-statement.md) - the same syntax for generic aliases
