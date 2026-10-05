---
id: python-sec-path-containment
lang: python
prefix: sec
title: Resolve user-supplied paths and verify they stay under the intended root
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path traversal, resolve, containment, upload]
  files: ["**/*.py"]
  symbols: [Path.resolve, Path.is_relative_to]
related: [python-sec-tempfile-secure]
sources:
  - title: pathlib - Expanding and resolving paths
    url: https://docs.python.org/3/library/pathlib.html
---

> Resolve user paths and verify containment under the intended root.

## Why

Joining a name like `../../etc/passwd` onto a root escapes the directory without any error, and absolute components replace the root entirely. `Path.resolve` produces the canonical path with symlinks and `..` eliminated, and `is_relative_to` then checks containment against the resolved root. The check must run on the resolved candidate, not on the raw string.

## Bad

```python
from pathlib import Path

ROOT = Path("/srv/uploads")


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")
```

## Good

```python
from pathlib import Path

ROOT = Path("/srv/uploads").resolve()


def read(name: str) -> str:
    candidate = (ROOT / name).resolve()
    if not candidate.is_relative_to(ROOT):
        raise ValueError(f"path escapes root: {name}")
    return candidate.read_text(encoding="utf-8")
```

## See Also

- [python-sec-tempfile-secure](sec-tempfile-secure.md) - the same care for paths the program creates itself
