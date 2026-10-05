---
id: python-proj-requires-python
lang: python
prefix: proj
title: Declare requires-python so installers enforce the supported interpreter range
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [requires-python, version, installers]
  files: ["**/*.py"]
  symbols: [sys.version_info]
related: [python-proj-pyproject-metadata]
sources:
  - title: Writing your pyproject.toml - requires-python
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Declare requires-python so installers enforce the interpreter range.

## Why

The guide distinguishes the two mechanisms: classifiers only affect searching and browsing on PyPI, while `requires-python` is what actually restricts installation, and pip looks back through older releases until it finds one matching the running interpreter. A runtime `sys.version_info` check fails after the package is already installed. The metadata field lets the resolver choose a compatible release before anything is installed.

## Bad

```python
import sys


def supported() -> bool:
    return sys.version_info >= (3, 9)  # runtime check only; metadata says nothing
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    requires_python = tomllib.load(handle)["project"]["requires-python"]

assert requires_python == ">= 3.10"
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - the table this field belongs to
