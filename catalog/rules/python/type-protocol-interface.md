---
id: python-type-protocol-interface
lang: python
prefix: type
title: Define structural interfaces as Protocols and annotate parameters with the capability they use
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Protocol, interface, structural, duck typing]
  files: ["**/*.py"]
  symbols: [Protocol]
related: [python-type-generic-syntax]
sources:
  - title: typing - Nominal vs structural subtyping
    url: https://docs.python.org/3/library/typing.html
  - title: typing - Protocols
    url: https://docs.python.org/3/library/typing.html
---

> Define structural interfaces with Protocol; annotate parameters with the capability they use.

## Why

A Protocol lets any class with the right methods satisfy the interface without inheritance, matching Python's duck typing while keeping the checker informed. Concrete parameter types force callers to subclass or wrap, even when they already provide the needed methods. Capability types keep functions usable and their requirements explicit.

## Bad

```python
class CsvWriter:
    def write(self, row: list[str]) -> None:
        raise NotImplementedError


def dump(writer: CsvWriter, rows: list[list[str]]) -> None:
    for row in rows:
        writer.write(row)
```

## Good

```python
from typing import Protocol


class RowWriter(Protocol):
    def write(self, row: list[str]) -> None: ...


def dump(writer: RowWriter, rows: list[list[str]]) -> None:
    for row in rows:
        writer.write(row)
```

## See Also

- [python-type-generic-syntax](type-generic-syntax.md) - Protocols compose with type parameters for generic capabilities
