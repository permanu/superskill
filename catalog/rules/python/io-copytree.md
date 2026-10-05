---
id: python-io-copytree
lang: python
prefix: io
title: Copy directory trees with shutil.copytree instead of a hand-rolled walk
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copytree, directory, copy, shutil]
  files: ["**/*.py"]
  symbols: [shutil.copytree]
related: [python-io-copy-file, python-io-walk-prune]
sources:
  - title: shutil - High-level file operations
    url: https://docs.python.org/3/library/shutil.html
---

> Copy directory trees with shutil.copytree; a manual loop misses metadata, permissions, and nested directories.

## Why

The shutil docs state that copytree recursively copies an entire directory tree, copying directory permissions and times with copystat and individual files with copy2 by default, and creating intermediate directories as required. It collects per-file failures into a shutil.Error and accepts an ignore callable to filter entries. A hand-written loop must reproduce permissions, nested directories, and error collection on its own.

## Bad

```python
import os
import shutil


def clone_tree(source: str, target: str) -> None:
    os.makedirs(target, exist_ok=True)
    for name in os.listdir(source):
        src_path = os.path.join(source, name)
        dst_path = os.path.join(target, name)
        if os.path.isdir(src_path):
            clone_tree(src_path, dst_path)
        else:
            shutil.copy(src_path, dst_path)
```

## Good

```python
import shutil


def clone_tree(source: str, target: str) -> None:
    shutil.copytree(source, target)
```

## See Also

- [python-io-copy-file](io-copy-file.md) - the single-file primitive behind copytree
- [python-io-walk-prune](io-walk-prune.md) - walking trees without descending into everything
