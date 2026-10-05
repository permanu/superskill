---
id: python-type-literal-sets
lang: python
prefix: type
title: Constrain finite value sets with Literal instead of accepting a bare str
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Literal, allowed values, strings, config]
  files: ["**/*.py"]
  symbols: [Literal]
related: [python-type-newtype-ids]
sources:
  - title: typing - Literal
    url: https://docs.python.org/3/library/typing.html
  - title: PEP 695 - Generic Type Alias
    url: https://peps.python.org/pep-0695/
---

> Use Literal for finite value sets; bare str accepts every string.

## Why

`Literal` turns a documented set of allowed values into a checked type, so typos fail at the checker instead of in a branch that was supposed to be unreachable. The values stay plain strings at runtime, so no wrapper or conversion is needed. An alias keeps a repeated set in one place.

## Bad

```python
def open_log(path: str, mode: str) -> tuple[str, str]:
    if mode not in {"r", "w"}:
        raise ValueError(mode)
    return (path, mode)
```

## Good

```python
from typing import Literal

type LogMode = Literal["r", "w"]


def open_log(path: str, mode: LogMode) -> tuple[str, str]:
    return (path, mode)
```

## See Also

- [python-type-newtype-ids](type-newtype-ids.md) - the companion brand for identifiers that share a primitive type
