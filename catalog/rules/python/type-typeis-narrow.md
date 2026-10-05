---
id: python-type-typeis-narrow
lang: python
prefix: type
title: Type user-defined predicates with TypeIs so both branches narrow
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [TypeIs, narrowing, predicate, typing]
  files: ["**/*.py"]
  symbols: [typing.TypeIs]
related: [python-type-narrow-dont-cast]
sources:
  - title: typing - Support for type hints
    url: https://docs.python.org/3/library/typing.html
---

> Type predicate functions with TypeIs; a bool return leaves the checker with nothing to narrow.

## Why

The typing docs describe TypeIs as a special construct for marking user-defined type predicate functions, accepting a single type argument and returning a boolean at runtime. The docs state that TypeIs requires the narrowed type to be a subtype of the input type, that a True result lets checkers combine the known type with the TypeIs type, and that a False result excludes it. For incompatible pairs like list[object] to list[str] under list invariance, the docs point to TypeGuard instead.

## Bad

```python
def is_int(value: str | int) -> bool:
    return isinstance(value, int)
```

## Good

```python
from typing import TypeIs


def is_int(value: str | int) -> TypeIs[int]:
    return isinstance(value, int)
```

## See Also

- [python-type-narrow-dont-cast](type-narrow-dont-cast.md) - relying on narrowing instead of casts
