---
id: python-type-override-decorator
lang: python
prefix: type
title: Mark overriding methods with typing.override
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [override, subclass, decorator, typing]
  files: ["**/*.py"]
  symbols: [typing.override]
related: [python-type-final-methods]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Mark overriding methods with @override; a renamed or typo'd method then fails the check.

## Why

The typing docs state that @override indicates a method is intended to override a method or attribute in a superclass, and that type checkers should emit an error if a decorated method does not override anything. A method whose name drifts from the base class keeps compiling and simply stops being called. The decorator turns that silent break into a checker error at the definition site.

## Bad

```python
class Base:
    def log_status(self) -> None:
        print("ok")


class Child(Base):
    def log_stauts(self) -> None:
        print("child")
```

## Good

```python
from typing import override


class Base:
    def log_status(self) -> None:
        print("ok")


class Child(Base):
    @override
    def log_status(self) -> None:
        print("child")
```

## See Also

- [python-type-final-methods](type-final-methods.md) - the marker on the side that forbids overrides
