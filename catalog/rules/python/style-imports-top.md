---
id: python-style-imports-top
lang: python
prefix: style
title: Keep imports at the top, grouped and separated
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [imports, grouping, order, style]
  files: ["**/*.py"]
  symbols: [import]
related: [python-style-import-single-line, python-anti-wildcard-import]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Put imports at the top in three groups; a local import hides a dependency inside a function.

## Why

PEP 8 states that imports are always put at the top of the file, just after module comments and docstrings, and before module globals and constants, grouped in the order standard library, related third party, and local application imports, with a blank line between groups. The top of the file is where readers and tooling scan for dependencies. An import buried in a function hides that dependency and pays its cost on every call.

## Bad

```python
import os


def read(path: str) -> str:
    import json

    with open(path, encoding="utf-8") as handle:
        return json.load(handle)["name"]
```

## Good

```python
import json
import os


def read(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)["name"]
```

## See Also

- [python-style-import-single-line](style-import-single-line.md) - how the individual imports are written
- [python-anti-wildcard-import](anti-wildcard-import.md) - what not to import
