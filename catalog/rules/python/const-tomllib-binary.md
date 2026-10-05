---
id: python-const-tomllib-binary
lang: python
prefix: const
title: Open TOML files in binary mode for tomllib
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tomllib, TOML, binary mode, configuration]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-pyproject-metadata, python-data-encoding-explicit]
sources:
  - title: tomllib - Parse TOML files
    url: https://docs.python.org/3/library/tomllib.html
---

> Open TOML files in binary mode for tomllib; the parser requires a binary file object.

## Why

The tomllib docs state that load's first argument should be a readable and binary file object, and their example opens pyproject.toml with mode "rb". The module decodes the bytes itself according to the TOML specification, so a text-mode handle fails immediately with a TypeError. Binary mode also keeps the parser independent of the locale encoding.

## Bad

```python
import tomllib


def load(path: str) -> dict[str, object]:
    with open(path, encoding="utf-8") as handle:
        return tomllib.load(handle)
```

## Good

```python
import tomllib


def load(path: str) -> dict[str, object]:
    with open(path, "rb") as handle:
        return tomllib.load(handle)
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - the file this parser usually reads
- [python-data-encoding-explicit](data-encoding-explicit.md) - where text-mode handles still need an encoding
