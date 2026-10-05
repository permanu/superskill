---
id: python-proj-build-system-pinned
lang: python
prefix: proj
title: Declare the build backend with a version constraint in the build-system table
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [build-system, backend, requires, hatchling]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-pyproject-metadata]
sources:
  - title: Writing your pyproject.toml - Declaring the build backend
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Declare the build backend with a constrained version in [build-system].

## Why

The guide says the `[build-system]` table should always be present because it defines which backend builds the project, and that `requires` lists the backend package with version constraints such as `setuptools >= 61.0`. Frontends install `requires` into an isolated environment, so an unconstrained name resolves to whatever is newest at build time. A lower bound states the minimum backend behavior the project relies on.

## Bad

```python
# Metadata written without a declared backend or version bounds.
BUILD_REQUIRES: list[str] = ["hatchling"]
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    build = tomllib.load(handle)["build-system"]

assert build["build-backend"] == "hatchling.build"
assert build["requires"] == ["hatchling >= 1.26"]
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - the metadata this backend builds
