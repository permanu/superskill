---
id: python-pkg-build-isolation
lang: python
prefix: pkg
title: Keep build isolation on for source installs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [build isolation, sdist, pip, build]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-only-binary, python-proj-build-system-pinned]
sources:
  - title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
---

> Build source distributions in isolation; --no-build-isolation makes the build depend on ambient packages.

## Why

The pip install reference documents --no-build-isolation as disabling isolation when building a modern source distribution and requires that the build dependencies specified by PEP 518 are already installed. Isolation builds each project against exactly its declared build requirements instead of whatever happens to be installed. Turning it off makes the resulting wheel depend on the ambient environment, so the same sdist builds differently on different machines.

## Bad

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--no-build-isolation", package],
        check=True,
    )
```

## Good

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)
```

## See Also

- [python-pkg-only-binary](pkg-only-binary.md) - avoiding source builds in deployments entirely
- [python-proj-build-system-pinned](proj-build-system-pinned.md) - declaring the build requirements isolation installs
