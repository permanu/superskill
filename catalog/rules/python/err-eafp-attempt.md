---
id: python-err-eafp-attempt
lang: python
prefix: err
title: Attempt the operation and handle its failure instead of checking first and racing the check
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [EAFP, LBYL, race, exists, open]
  files: ["**/*.py"]
  symbols: [Path.exists, FileNotFoundError]
related: [python-err-boundary-errors]
sources:
  - title: Python Glossary - EAFP
    url: https://docs.python.org/3/glossary.html
  - title: Python Tutorial - Predefined Clean-up Actions
    url: https://docs.python.org/3/tutorial/errors.html
---

> Attempt the operation and handle its failure; checking first races the check against the act.

## Why

A check followed by an action is two operations with a window between them: the file disappears, the permissions change, the socket closes. Attempting the operation collapses both into one and lets the specific failure drive the handler. EAFP is the documented Python style for exactly this reason, and it removes duplicated work when the check repeats what the action already does.

## Bad

```python
from pathlib import Path


def read_size(path: Path) -> int:
    if path.exists():
        return len(path.read_bytes())
    raise FileNotFoundError(path)
```

## Good

```python
from pathlib import Path


def read_size(path: Path) -> int:
    return len(path.read_bytes())
```

## See Also

- [python-err-boundary-errors](err-boundary-errors.md) - where explicit checks do earn their place: parsing external input
