---
id: python-anti-wildcard-import
lang: python
prefix: anti
title: Import names explicitly; wildcard imports hide which names are present
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import, wildcard, namespace, lint]
  files: ["**/*.py"]
  symbols: [__all__]
related: [python-api-all-public]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
  - title: The Python Tutorial - Modules
    url: https://docs.python.org/3/tutorial/modules.html
---

> Avoid import *; it hides which names a module uses and overwrites existing bindings.

## Why

PEP 8 says wildcard imports should be avoided because they make it unclear which names are present in the namespace, confusing both readers and automated tools. The tutorial notes that import * brings in every name not beginning with an underscore, so the imported set changes whenever the source module changes. Naming the imports keeps the dependency list visible and lets linters flag unused names.

## Bad

```python
from math import *


def circle_area(radius: float) -> float:
    return pi * radius**2
```

## Good

```python
from math import pi


def circle_area(radius: float) -> float:
    return pi * radius**2
```

## See Also

- [python-api-all-public](api-all-public.md) - declaring the intended export list for import *
