---
id: python-type-avoid-any
lang: python
prefix: type
title: Keep Any out of new signatures and use object or a precise union when the type is unknown
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Any, object, unknown, escape hatch]
  files: ["**/*.py"]
  symbols: [Any, object]
related: [python-type-generic-syntax, python-type-annotate-signatures]
sources:
  - title: typing - The Any type
    url: https://docs.python.org/3/library/typing.html
  - title: typing - Generics
    url: https://docs.python.org/3/library/typing.html
---

> Keep Any out of new signatures; use object or a precise union when the type is unknown.

## Why

`Any` disables checking in both directions: every type assigns to it, and it assigns to every type, so mistakes cross the boundary unnoticed. `object` is the typesafe unknown, where values can be stored and passed but not used until narrowed. A type parameter preserves the caller's actual type instead of erasing it.

## Bad

```python
from typing import Any


def first_item(items: list[Any]) -> Any:
    return items[0]
```

## Good

```python
def first_item[T](items: list[T]) -> T:
    return items[0]
```

## See Also

- [python-type-generic-syntax](type-generic-syntax.md) - declaring the type parameter used here
- [python-type-annotate-signatures](type-annotate-signatures.md) - the annotation surface Any leaks through
