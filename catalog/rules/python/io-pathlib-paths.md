---
id: python-io-pathlib-paths
lang: python
prefix: io
title: Build and combine filesystem paths with pathlib instead of os.path strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pathlib, paths, os.path, join]
  files: ["**/*.py"]
  symbols: [pathlib.Path]
related: [python-io-glob-patterns, python-io-scandir-walk]
sources:
  - title: pathlib - Object-oriented filesystem paths
    url: https://docs.python.org/3/library/pathlib.html
---

> Build paths with pathlib; string joins and manual separators lose the platform semantics the library provides.

## Why

The pathlib docs present the module as classes representing filesystem paths with semantics appropriate for different operating systems, split between pure paths for computation and concrete paths that add I/O. The slash operator creates child paths in place of os.path.join, and the same objects carry the file operations. Passing ordinary strings around separates the path from the operations that understand it.

## Bad

```python
import os


def report_path(base: str, name: str) -> str:
    return os.path.join(base, "reports", name + ".txt")
```

## Good

```python
from pathlib import Path


def report_path(base: Path, name: str) -> Path:
    return base / "reports" / f"{name}.txt"
```

## See Also

- [python-io-glob-patterns](io-glob-patterns.md) - matching files on the same path objects
- [python-io-scandir-walk](io-scandir-walk.md) - the directory side of the same API
