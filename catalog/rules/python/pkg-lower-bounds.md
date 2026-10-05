---
id: python-pkg-lower-bounds
lang: python
prefix: pkg
title: Declare a tested lower bound and an upper bound only for known breaks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lower bound, upper bound, install_requires, dependencies]
  files: ["**/*.py"]
  symbols: [dependencies]
related: [python-pkg-app-vs-library-pins, python-proj-pyproject-metadata]
sources:
  - title: install_requires vs requirements files
    url: https://packaging.python.org/en/latest/discussions/install-requires-vs-requirements/
---

> Set the floor you tested; add an upper bound only when a release is known to break you.

## Why

The install_requires discussion states that dependency metadata should specify what a project minimally needs to run, and that it is best practice to indicate any known lower or upper bounds. Its examples show >=1 for a tested minimum and >=1,<2 when a major release is known to break compatibility. It also warns that pinning exact versions or listing sub-dependencies is overly restrictive and blocks dependency upgrades.

## Bad

```python
def dependencies() -> list[str]:
    return ["httpx", "rich"]
```

## Good

```python
def dependencies() -> list[str]:
    return ["httpx>=0.27", "rich>=13"]
```

## See Also

- [python-pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - why published metadata avoids exact pins
- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - declaring the dependency list
