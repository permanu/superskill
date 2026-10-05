---
id: python-sec-archive-extract-filter
lang: python
prefix: sec
title: Extract archives with the data filter, never blind extractall
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tarfile, extractall, filter, archive extraction]
  files: ["**/*.py"]
  symbols: [tarfile.TarFile.extractall]
related: [python-sec-path-containment, python-sec-tempfile-secure]
sources:
  - title: tarfile - Read and write tar archive files
    url: https://docs.python.org/3/library/tarfile.html
  - title: shutil - High-level file operations
    url: https://docs.python.org/3/library/shutil.html
---

> Extract archives with filter="data"; without it a crafted member writes outside the target.

## Why

The tarfile docs warn never to extract archives from untrusted sources without prior inspection and recommend filter='data' for versions with a less secure default; that filter blocks most features specific to UNIX-like filesystems, including unsafe paths and links. The shutil archive docs carry the same warning for unpack_archive. A member named ../../etc/cron.d/evil or a link pointing outside the target is what the filter rejects.

## Bad

```python
import tarfile


def unpack(path: str, target: str) -> None:
    with tarfile.open(path) as archive:
        archive.extractall(target)
```

## Good

```python
import tarfile


def unpack(path: str, target: str) -> None:
    with tarfile.open(path) as archive:
        archive.extractall(target, filter="data")
```

## See Also

- [python-sec-path-containment](sec-path-containment.md) - the same traversal concern for single paths
- [python-sec-tempfile-secure](sec-tempfile-secure.md) - safe destinations for extracted content
