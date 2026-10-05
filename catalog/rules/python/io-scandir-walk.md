---
id: python-io-scandir-walk
lang: python
prefix: io
title: Walk directories with os.scandir so entries cache their type and stat data
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [scandir, listdir, DirEntry, directory]
  files: ["**/*.py"]
  symbols: [os.scandir, os.DirEntry]
related: [python-io-glob-patterns, python-io-walk-prune]
sources:
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
---

> Iterate directories with os.scandir; DirEntry objects carry the type and stat data gathered while scanning.

## Why

The os docs state that using scandir instead of listdir can significantly increase the performance of code that also needs file type or file attribute information, because DirEntry objects expose that information when the operating system provides it during the scan. The iterator supports the context manager protocol, and the docs advise using it explicitly. listdir followed by isfile and getsize re-queries the filesystem for data the scan already had.

## Bad

```python
import os


def total_size(root: str) -> int:
    total = 0
    for name in os.listdir(root):
        path = os.path.join(root, name)
        if os.path.isfile(path):
            total += os.path.getsize(path)
    return total
```

## Good

```python
import os


def total_size(root: str) -> int:
    total = 0
    with os.scandir(root) as entries:
        for entry in entries:
            if entry.is_file():
                total += entry.stat().st_size
    return total
```

## See Also

- [python-io-glob-patterns](io-glob-patterns.md) - matching entries with the pattern language
- [python-io-walk-prune](io-walk-prune.md) - the recursive walk built on the same scan
