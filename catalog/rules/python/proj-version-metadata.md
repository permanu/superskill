---
id: python-proj-version-metadata
lang: python
prefix: proj
title: Single-source the version and read it through importlib.metadata
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [version, importlib.metadata, single source]
  files: ["**/*.py"]
  symbols: [importlib.metadata.version]
related: [python-proj-pyproject-metadata]
sources:
  - title: importlib.metadata - Distribution versions
    url: https://docs.python.org/3/library/importlib.metadata.html
  - title: Writing your pyproject.toml - Static vs. dynamic metadata
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Single-source the version and read it through importlib.metadata.

## Why

The packaging guide describes marking `version` as dynamic so the build backend fills it from one place, such as a `__version__` attribute or a Git tag. `importlib.metadata.version()` then reads the installed distribution's recorded version, which is the value the installer actually used. A second literal in the source drifts from the metadata and ships a package that lies about itself.

## Bad

```python
__version__ = "1.0.0"  # duplicated in pyproject.toml
```

## Good

```python
from importlib.metadata import version

__version__ = version("spam-eggs")
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - where the version is declared
