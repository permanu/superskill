---
id: python-type-param-spec
lang: python
prefix: type
title: Preserve wrapped signatures with ParamSpec in decorators
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ParamSpec, decorator, signature, typing]
  files: ["**/*.py"]
  symbols: [typing.ParamSpec]
related: [python-type-generic-syntax]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
  - title: PEP 612 - Parameter Specification Variables
    url: https://peps.python.org/pep-0612/
---

> Preserve the wrapped signature with ParamSpec; Callable[..., T] erases every parameter.

## Why

The typing docs describe ParamSpec as a specialized version of type variables for parameter lists, used as Callable[P, R] with P.args and P.kwargs inside the wrapper. A decorator annotated with Callable[..., T] accepts any arguments but tells the checker nothing about the wrapped function, so bad calls pass. ParamSpec carries the original parameter types through the decorator to the call site.

## Bad

```python
from collections.abc import Callable


def retry(func: Callable[..., object]) -> Callable[..., object]:
    def wrapper(*args: object, **kwargs: object) -> object:
        return func(*args, **kwargs)

    return wrapper
```

## Good

```python
from collections.abc import Callable
from typing import ParamSpec

P = ParamSpec("P")


def retry(func: Callable[P, object]) -> Callable[P, object]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> object:
        return func(*args, **kwargs)

    return wrapper
```

## See Also

- [python-type-generic-syntax](type-generic-syntax.md) - declaring type parameters for the same machinery
