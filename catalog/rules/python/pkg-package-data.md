---
id: python-pkg-package-data
lang: python
prefix: pkg
title: Keep runtime data inside the package and read it with importlib.resources
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [package data, importlib.resources, templates, packaging]
  files: ["**/*.py"]
  symbols: [importlib.resources.files]
related: [python-pkg-distribution-import-names]
sources:
  - title: setuptools - Data Files Support
    url: https://setuptools.pypa.io/en/latest/userguide/datafiles.html
---

> Keep runtime data inside the package and read it with importlib.resources.

## Why

The setuptools data files guide states that the most common use case for data files is use by the package itself, usually by including the files inside the package directory, and that data outside the package directory has no reliable installation path for pip-based installs. It recommends importlib.resources for reading them, since direct path manipulation breaks when the package is imported from a zip file or an installed wheel. Declaring the patterns keeps the inclusion explicit and reviewable.

## Bad

```python
from pathlib import Path


def template_path(package_dir: Path) -> Path:
    return package_dir.parent / "templates" / "welcome.txt"
```

## Good

```python
from importlib import resources


def template_text() -> str:
    return (resources.files("mypkg") / "templates" / "welcome.txt").read_text(encoding="utf-8")
```

## See Also

- [python-pkg-distribution-import-names](pkg-distribution-import-names.md) - resolving the package that provides a name
