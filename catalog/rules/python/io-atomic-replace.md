---
id: python-io-atomic-replace
lang: python
prefix: io
title: Replace files atomically by writing a temporary file and calling os.replace
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [atomic, replace, tempfile, save]
  files: ["**/*.py"]
  symbols: [os.replace, tempfile.NamedTemporaryFile]
related: [python-io-copy-file, python-io-move-cross-device]
sources:
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
  - title: tempfile - Temporary files and directories
    url: https://docs.python.org/3/library/tempfile.html
---

> Write to a temporary file and os.replace it; in-place writes can leave readers a truncated file.

## Why

The os docs state that a successful os.replace is an atomic operation, a POSIX requirement, so a concurrent reader sees either the old file or the new one. Writing the destination in place truncates it first, so a crash or failure mid-write leaves a partial file. tempfile.NamedTemporaryFile supplies the scratch file in the destination directory, which keeps the replace on one filesystem.

## Bad

```python
def save(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)
```

## Good

```python
import os
import tempfile


def save(path: str, text: str) -> None:
    directory = os.path.dirname(path) or "."
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory, delete=False) as handle:
        handle.write(text)
        temp_name = handle.name
    os.replace(temp_name, path)
```

## See Also

- [python-io-copy-file](io-copy-file.md) - the fast-copy path for whole files
- [python-io-move-cross-device](io-move-cross-device.md) - why the replace must stay on one filesystem
