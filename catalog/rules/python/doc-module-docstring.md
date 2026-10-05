---
id: python-doc-module-docstring
lang: python
prefix: doc
title: Open modules with a docstring describing their contents and usage
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module docstring, pydoc, documentation, help]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-docstring-public]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: Google Python Style Guide
    url: https://google.github.io/styleguide/pyguide.html
---

> Open modules with a docstring describing their contents and usage.

## Why

PEP 257 states that the docstring for a module should generally list the classes, exceptions, and functions it exports with a one-line summary of each. The Google style guide says files should start with a docstring describing the contents and usage of the module. The module docstring is what pydoc and help(module) display first.

## Bad

```python
import json


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## Good

```python
"""Helpers for reading JSON payloads.

Exposes parse() for decoding text into dictionaries.
"""

import json


def parse(text: str) -> dict[str, object]:
    return json.loads(text)
```

## See Also

- [python-doc-docstring-public](doc-docstring-public.md) - the same rule for classes and functions
