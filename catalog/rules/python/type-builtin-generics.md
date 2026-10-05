---
id: python-type-builtin-generics
lang: python
prefix: type
title: Annotate with built-in generics and collections.abc types instead of typing aliases
severity: should
enforce: tool
tool: ruff:UP006
baseline: latest
status: verified
triggers:
  keywords: [generics, list, dict, collections.abc, typing aliases]
  files: ["**/*.py"]
  symbols: [List, Dict, Sequence, Iterable]
related: [python-type-union-pipe]
sources:
  - title: typing - Deprecated aliases
    url: https://docs.python.org/3/library/typing.html
  - title: Ruff UP006 - non-pep585-annotation
    url: https://docs.astral.sh/ruff/rules/non-pep585-annotation/
---

> Use list[int] and collections.abc types in annotations instead of typing aliases.

## Why

Built-in collections are generic directly, and the `typing` aliases for them are deprecated. Parameters should accept abstract capability types such as `Iterable` or `Sequence` so any conforming object works, while concrete containers belong in return values and stored state. This keeps signatures both modern and broadly usable.

## Bad

```python
from typing import Dict, List


def total(values: List[int]) -> Dict[str, int]:
    return {"sum": sum(values), "count": len(values)}
```

## Good

```python
from collections.abc import Iterable


def total(values: Iterable[int]) -> dict[str, int]:
    items = list(values)
    return {"sum": sum(items), "count": len(items)}
```

## See Also

- [python-type-union-pipe](type-union-pipe.md) - the matching shorthand for unions inside these generics
