---
id: python-io-move-cross-device
lang: python
prefix: io
title: Move files with shutil.move so cross-filesystem moves fall back to copy and delete
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [move, rename, filesystem, shutil]
  files: ["**/*.py"]
  symbols: [shutil.move, os.rename]
related: [python-io-copy-file, python-io-atomic-replace]
sources:
  - title: shutil - High-level file operations
    url: https://docs.python.org/3/library/shutil.html
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
---

> Move files with shutil.move; os.rename fails across filesystems, where the move needs a copy fallback.

## Why

The shutil docs describe move as using os.rename when source and destination share a filesystem and falling back to the copy function, followed by removal of the source, when the rename fails. The os docs state that rename may fail when the two paths are on different filesystems and direct callers to shutil.move for that case. rename is the right primitive only when the same-filesystem assumption is known to hold.

## Bad

```python
import os


def archive(source: str, target: str) -> None:
    os.rename(source, target)
```

## Good

```python
import shutil


def archive(source: str, target: str) -> None:
    shutil.move(source, target)
```

## See Also

- [python-io-copy-file](io-copy-file.md) - the copy that the move falls back to
- [python-io-atomic-replace](io-atomic-replace.md) - the same-filesystem atomic rename
