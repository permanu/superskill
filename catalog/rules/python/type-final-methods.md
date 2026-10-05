---
id: python-type-final-methods
lang: python
prefix: type
title: Mark non-overridable methods and classes with typing.final
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [final, override, subclassing, typing]
  files: ["**/*.py"]
  symbols: [typing.final]
related: [python-type-final-classvar, python-type-override-decorator]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Mark methods and classes with typing.final; checkers then flag overrides the design forbids.

## Why

The typing docs state that decorating a method with @final indicates to a type checker that the method cannot be overridden in a subclass, and that decorating a class with @final indicates it cannot be subclassed. Code that relies on an exact implementation, such as a security check or a serialization format, breaks silently when a subclass replaces it. The decorator turns that break into a checker error at the point of the override.

## Bad

```python
class Base:
    def close(self) -> None:
        print("close")


class Child(Base):
    def close(self) -> None:
        print("child close")
```

## Good

```python
from typing import final


class Base:
    @final
    def close(self) -> None:
        print("close")


class Child(Base):
    def close(self) -> None:
        print("child close")
```

## See Also

- [python-type-final-classvar](type-final-classvar.md) - Final for constants and class attributes
- [python-type-override-decorator](type-override-decorator.md) - the marker on the overriding side
