---
id: python-api-all-public
lang: python
prefix: api
title: Declare the public API in __all__
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [__all__, public api, exports, introspection]
  files: ["**/*.py"]
  symbols: [__all__]
related: [python-anti-wildcard-import]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
  - title: The Python Tutorial - Modules
    url: https://docs.python.org/3/tutorial/modules.html
---

> Declare the public names in __all__; the export list is then explicit and introspectable.

## Why

PEP 8 states that modules should explicitly declare the names in their public API using the __all__ attribute, and the tutorial explains that import * imports every name not beginning with an underscore. Without __all__, imported helpers and modules are part of that export set. The list also documents what the module promises and what import * will take.

## Bad

```python
import json


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## Good

```python
import json

__all__ = ["parse"]


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## See Also

- [python-anti-wildcard-import](anti-wildcard-import.md) - why explicit imports are preferred over import *
