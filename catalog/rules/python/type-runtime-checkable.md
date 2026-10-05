---
id: python-type-runtime-checkable
lang: python
prefix: type
title: Mark runtime-checked protocols with runtime_checkable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [runtime_checkable, Protocol, isinstance, typing]
  files: ["**/*.py"]
  symbols: [typing.runtime_checkable]
related: [python-type-protocol-interface]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Mark runtime-checked protocols with @runtime_checkable; plain protocols raise on isinstance.

## Why

The typing docs state that @runtime_checkable marks a protocol class as a runtime protocol usable with isinstance() and issubclass(), and that this allows a simple-minded structural check similar to collections.abc classes. A protocol without the decorator cannot be used as the second argument to isinstance at all, so the check fails at runtime. The docs also note the check sees only the presence of the attributes, not their types.

## Bad

```python
from typing import Protocol


class Closable(Protocol):
    def close(self) -> None: ...


def is_closable(value: object) -> bool:
    return isinstance(value, Closable)
```

## Good

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class Closable(Protocol):
    def close(self) -> None: ...


def is_closable(value: object) -> bool:
    return isinstance(value, Closable)
```

## See Also

- [python-type-protocol-interface](type-protocol-interface.md) - accepting structural interfaces at type-check time
