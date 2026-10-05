---
id: python-style-import-single-line
lang: python
prefix: style
title: Put each import on its own line
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [imports, lines, style, readability]
  files: ["**/*.py"]
  symbols: [import]
related: [python-style-imports-top]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> One import per line; comma-joined imports are harder to read and to diff.

## Why

PEP 8 states that imports should usually be on separate lines and marks import sys, os as wrong, while allowing from subprocess import Popen, PIPE. Separate lines keep each dependency individually visible in diffs and reviews. The from form already groups related names, so the comma-joined module import adds nothing.

## Bad

```python
import os, sys


def home() -> str:
    return os.environ.get("HOME", sys.prefix)
```

## Good

```python
import os
import sys


def home() -> str:
    return os.environ.get("HOME", sys.prefix)
```

## See Also

- [python-style-imports-top](style-imports-top.md) - where those imports go
