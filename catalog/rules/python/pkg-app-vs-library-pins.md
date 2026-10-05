---
id: python-pkg-app-vs-library-pins
lang: python
prefix: pkg
title: Pin exact versions for applications, ranges for published libraries
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pinning, dependencies, versions, libraries]
  files: ["**/*.py"]
  symbols: [dependencies]
related: [python-pkg-lower-bounds, python-proj-pyproject-metadata]
sources:
  - title: Version specifiers
    url: https://packaging.python.org/en/latest/specifications/version-specifiers/
  - title: install_requires vs requirements files
    url: https://packaging.python.org/en/latest/discussions/install-requires-vs-requirements/
---

> Reserve exact pins for applications; published dependency metadata should admit compatible upgrades.

## Why

The version specifiers spec states that using == without a wildcard when defining dependencies for published distributions is strongly discouraged because it complicates the deployment of security fixes, and that strict matching is intended primarily for repeatable deployments of applications. The install_requires discussion makes the same split: exhaustive pins belong in requirements files for a complete environment, not in library metadata. A published pin blocks every dependent from receiving a patched release.

## Bad

```python
def library_dependencies() -> list[str]:
    return ["httpx==0.27.0"]
```

## Good

```python
def library_dependencies() -> list[str]:
    return ["httpx>=0.27,<0.28"]
```

## See Also

- [python-pkg-lower-bounds](pkg-lower-bounds.md) - choosing the bounds for published metadata
- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - where published dependencies are declared
