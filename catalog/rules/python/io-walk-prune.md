---
id: python-io-walk-prune
lang: python
prefix: io
title: Prune os.walk traversals by editing dirnames in place
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [os.walk, prune, dirnames, traversal]
  files: ["**/*.py"]
  symbols: [os.walk]
related: [python-io-scandir-walk, python-io-copytree]
sources:
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
---

> Prune os.walk by editing dirnames in place; filtering results after the walk still visits the skipped trees.

## Why

The os docs state that when topdown is true the caller can modify the dirnames list in place and walk will only recurse into the names that remain, and that this prunes the search. Removing entries from dirnames stops the traversal before it enters those directories, while filtering the yielded paths afterwards only hides them. Source trees, repository metadata, and build directories are the cases for the in-place edit.

## Bad

```python
import os


def source_files(root: str) -> list[str]:
    found = []
    for dirpath, _dirnames, filenames in os.walk(root):
        found.extend(
            os.path.join(dirpath, name) for name in filenames if name.endswith(".py")
        )
    return found
```

## Good

```python
import os

SKIP = {".git", "node_modules", "__pycache__"}


def source_files(root: str) -> list[str]:
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP]
        found.extend(
            os.path.join(dirpath, name) for name in filenames if name.endswith(".py")
        )
    return found
```

## See Also

- [python-io-scandir-walk](io-scandir-walk.md) - the scan primitive underneath walk
- [python-io-copytree](io-copytree.md) - copying trees, where pruning becomes the ignore callable
