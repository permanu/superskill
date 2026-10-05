---
id: python-type-overload-signatures
lang: python
prefix: type
title: Describe argument-dependent return types with overload
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overload, return type, unions, typing]
  files: ["**/*.py"]
  symbols: [typing.overload]
related: [python-type-union-pipe, python-type-narrow-dont-cast]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Describe argument-dependent returns with overload; one union signature loses which input produced which output.

## Why

The typing docs state that a series of @overload-decorated definitions must be followed by exactly one non-@overload definition, that the overloads exist for the type checker only, and that calling an overloaded function directly at runtime raises NotImplementedError. The final definition carries the runtime behavior, while the overloads state the correlation between argument and return types. Without them a single union signature forces callers to narrow a result the checker cannot connect to the input.

## Bad

```python
def parse(data: str | bytes) -> dict[str, object] | list[object]:
    if isinstance(data, bytes):
        return []
    return {}
```

## Good

```python
from typing import overload


@overload
def parse(data: str) -> dict[str, object]: ...


@overload
def parse(data: bytes) -> list[object]: ...


def parse(data: str | bytes) -> dict[str, object] | list[object]:
    if isinstance(data, bytes):
        return []
    return {}
```

## See Also

- [python-type-union-pipe](type-union-pipe.md) - the union syntax the overloads refine
- [python-type-narrow-dont-cast](type-narrow-dont-cast.md) - narrowing results instead of casting them
