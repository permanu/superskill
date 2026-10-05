---
id: python-style-dunder-placement
lang: python
prefix: style
title: Place module dunders after the docstring, before imports
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [__all__, dunders, imports, layout]
  files: ["**/*.py"]
  symbols: [__all__]
related: [python-style-imports-top, python-api-all-public]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Put __all__ and friends after the docstring and before imports, except future imports.

## Why

PEP 8 states that module level dunders such as __all__ and __version__ should be placed after the module docstring but before any import statements, except from __future__ imports. The position keeps the module's declared interface above the machinery that implements it. Tools that read __all__ find it before the code that the imports pull in.

## Bad

```python
import json

__all__ = ["parse"]


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## Good

```python
"""JSON helpers."""

__all__ = ["parse"]

import json


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## See Also

- [python-style-imports-top](style-imports-top.md) - where the imports themselves belong
- [python-api-all-public](api-all-public.md) - why the __all__ list exists
