---
id: python-lint-py-typed
lang: python
prefix: lint
title: Ship the py.typed marker so checkers use inline types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [py.typed, PEP 561, packaging, typing]
  files: ["**/*.py"]
  symbols: [py.typed]
related: [python-lint-type-check-ci, python-proj-pyproject-metadata]
sources:
  - title: PEP 561 - Distributing and Packaging Type Information
    url: https://peps.python.org/pep-0561/
---

> Add the py.typed marker to typed packages; without it consumers' checkers ignore the annotations.

## Why

PEP 561 states that package maintainers who wish to support type checking of their code must add a marker file named py.typed to their package, and that the marker applies recursively to sub-packages. Type checkers resolve inline types only for packages that opt in, so an unmarked package is treated as untyped. The marker is part of the distributed package data, so release checks should verify it ships.

## Bad

```python
from pathlib import Path


def check_package(package: Path) -> None:
    if not (package / "__init__.py").exists():
        raise FileNotFoundError(package)
```

## Good

```python
from pathlib import Path


def check_package(package: Path) -> None:
    if not (package / "__init__.py").exists():
        raise FileNotFoundError(package)
    if not (package / "py.typed").exists():
        raise FileNotFoundError(package / "py.typed")
```

## See Also

- [python-lint-type-check-ci](lint-type-check-ci.md) - running the checker that consumes the marker
- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - declaring package data in the project table
