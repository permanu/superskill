---
id: python-api-pathlike
lang: python
prefix: api
title: Accept os.PathLike in path parameters, not only str
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [PathLike, paths, parameters, api]
  files: ["**/*.py"]
  symbols: [os.PathLike, os.fspath]
related: [python-io-pathlib-paths]
sources:
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
---

> Accept os.PathLike in path parameters; str-only APIs force callers to stringify Path objects.

## Why

The os docs describe PathLike as the abstract base class for objects representing a file system path and fspath as returning the file system representation for str, bytes, or an object with __fspath__. Builtins such as open accept path-like objects, so a str-only annotation turns working runtime calls into type errors. Accept str | os.PathLike[str] and pass it through os.fspath.

## Bad

```python
def read_config(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()
```

## Good

```python
import os


def read_config(path: str | os.PathLike[str]) -> str:
    with open(os.fspath(path), encoding="utf-8") as handle:
        return handle.read()
```

## See Also

- [python-io-pathlib-paths](io-pathlib-paths.md) - the Path objects that callers want to pass
