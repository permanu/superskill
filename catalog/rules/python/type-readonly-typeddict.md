---
id: python-type-readonly-typeddict
lang: python
prefix: type
title: Mark immutable TypedDict items as ReadOnly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ReadOnly, TypedDict, immutability, typing]
  files: ["**/*.py"]
  symbols: [typing.ReadOnly]
related: [python-type-typeddict-boundary, python-type-typeddict-notrequired]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Mark immutable TypedDict items as ReadOnly; checkers then reject assignments to them.

## Why

The typing docs describe ReadOnly as a special construct that marks an item of a TypedDict as read-only, and their example shows assigning to a read-only key as a type checker error while other keys stay writable. Records that cross an API boundary mix stable identity fields with mutable state. Marking the stable fields documents which writes are allowed and catches violations at the call site.

## Bad

```python
from typing import TypedDict


class Movie(TypedDict):
    title: str
    year: int


def retitle(movie: Movie) -> None:
    movie["title"] = "Changed"
```

## Good

```python
from typing import ReadOnly, TypedDict


class Movie(TypedDict):
    title: ReadOnly[str]
    year: int


def retitle(movie: Movie) -> None:
    movie["year"] = 2000
```

## See Also

- [python-type-typeddict-boundary](type-typeddict-boundary.md) - TypedDict at the parsing boundary
- [python-type-typeddict-notrequired](type-typeddict-notrequired.md) - marking keys that may be absent
