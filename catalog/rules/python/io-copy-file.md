---
id: python-io-copy-file
lang: python
prefix: io
title: Copy whole files with shutil.copyfile instead of a manual read-write loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [copy, shutil, files, fast-copy]
  files: ["**/*.py"]
  symbols: [shutil.copyfile, shutil.copy2]
related: [python-io-copytree, python-io-atomic-replace]
sources:
  - title: shutil - High-level file operations
    url: https://docs.python.org/3/library/shutil.html
---

> Copy files with shutil.copyfile; manual read/write round-trips the payload through Python buffers.

## Why

The shutil docs explain that copyfile and its relatives use platform-specific fast-copy syscalls, and describe fast-copy as the copying happening within the kernel, avoiding userspace buffers in Python as in outfd.write(infd.read()). copyfile also rejects a source and destination that name the same file and exposes symlink handling through follow_symlinks. The manual loop provides none of that and holds the whole payload in Python memory.

## Bad

```python
def backup(source: str, target: str) -> None:
    with open(source, "rb") as src, open(target, "wb") as dst:
        dst.write(src.read())
```

## Good

```python
import shutil


def backup(source: str, target: str) -> None:
    shutil.copyfile(source, target)
```

## See Also

- [python-io-copytree](io-copytree.md) - the same choice for whole directory trees
- [python-io-atomic-replace](io-atomic-replace.md) - replacing a destination atomically
