---
id: python-pkg-distribution-import-names
lang: python
prefix: pkg
title: Depend on distribution names; import names are a different namespace
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [distribution, import name, metadata, dependencies]
  files: ["**/*.py"]
  symbols: [importlib.metadata.packages_distributions]
related: [python-pkg-app-vs-library-pins, python-proj-version-metadata]
sources:
  - title: Distribution package vs. import package
    url: https://packaging.python.org/en/latest/discussions/distribution-package-vs-import-package/
  - title: importlib.metadata - Accessing package metadata
    url: https://docs.python.org/3/library/importlib.metadata.html
---

> Depend on distribution names, not import names; the two are not guaranteed to match.

## Why

The distribution-versus-import discussion states that package indices do not enforce any relationship between a distribution's name and the import packages it provides, and warns that installing the distribution matching an import name may install an unintended package. Pillow is the canonical example: the distribution is Pillow while the import name is PIL. importlib.metadata's packages_distributions maps an installed import name back to the distributions that provide it.

## Bad

```python
def install_command(module: str) -> list[str]:
    return ["python", "-m", "pip", "install", module]
```

## Good

```python
from importlib.metadata import packages_distributions


def install_command(module: str) -> list[str]:
    distributions = packages_distributions().get(module, [])
    return ["python", "-m", "pip", "install", *distributions]
```

## See Also

- [python-pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - how those distributions should be constrained
- [python-proj-version-metadata](proj-version-metadata.md) - reading metadata from the installed distribution
