---
id: python-pkg-constraints-file
lang: python
prefix: pkg
title: Constrain shared versions with a constraints file
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constraints, pip, versions, dependencies]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-requirements-hashes, python-pkg-app-vs-library-pins]
sources:
  - title: pip - User Guide
    url: https://pip.pypa.io/en/stable/user_guide/
---

> Cap versions in a constraints file; it limits what installs may choose without adding dependencies.

## Why

pip's user guide states that constraints files only control which version of a requirement is installed, not whether it is installed, and that including a package in a constraints file does not trigger installation of that package. The guide describes the organizational use: one constraints file fixes the version used wherever that dependency appears. Adding the cap to a single requirements file instead only affects the installs that read that file.

## Bad

```python
import subprocess
import sys


def install(requirements: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", requirements, "anyio==4.0.0"],
        check=True,
    )
```

## Good

```python
import subprocess
import sys


def install(requirements: str, constraints: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-c", constraints, "-r", requirements],
        check=True,
    )
```

## See Also

- [python-pkg-requirements-hashes](pkg-requirements-hashes.md) - the pinned requirements this constrains
- [python-pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - when exact pins are appropriate
