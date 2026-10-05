---
id: python-io-glob-patterns
lang: python
prefix: io
title: Match path patterns with Path.glob instead of manual name filtering
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [glob, pattern, pathlib, files]
  files: ["**/*.py"]
  symbols: [pathlib.Path.glob, pathlib.Path.rglob]
related: [python-io-pathlib-paths, python-io-scandir-walk]
sources:
  - title: pathlib - Object-oriented filesystem paths
    url: https://docs.python.org/3/library/pathlib.html
---

> Match files with Path.glob; hand-filtered listings reimplement the pattern language and miss nested matches.

## Why

The pathlib docs give Path.glob the job of yielding all matching files for a relative pattern, with rglob as the recursive form, and document a shared pattern language with wildcards. Matches come back as paths, so no manual joining is required. A listdir loop that filters on a suffix sees one directory level and reimplements matching that the library already provides.

## Bad

```python
import os


def markdown_files(root: str) -> list[str]:
    return [
        os.path.join(root, name)
        for name in os.listdir(root)
        if name.endswith(".md")
    ]
```

## Good

```python
from pathlib import Path


def markdown_files(root: Path) -> list[Path]:
    return list(root.glob("*.md"))
```

## See Also

- [python-io-pathlib-paths](io-pathlib-paths.md) - building the base path that glob starts from
- [python-io-scandir-walk](io-scandir-walk.md) - the lower-level directory scan
