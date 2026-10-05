---
id: python-lint-compileall-ci
lang: python
prefix: lint
title: Byte-compile the package in CI before building
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [compileall, syntax, CI, build]
  files: ["**/*.py"]
  symbols: [compileall]
related: [python-proj-build-artifacts, python-lint-config-committed]
sources:
  - title: compileall - Byte-compile Python libraries
    url: https://docs.python.org/3/library/compileall.html
---

> Run compileall over the package before building; it catches syntax errors the tests never import.

## Why

The compileall docs describe the module as compiling Python source files in a directory tree, usable as python -m compileall, and returning a false value when any file fails to compile. Files that no test imports can still carry syntax errors that reach a release. Compiling the tree in CI fails the build before packaging instead of shipping a broken module.

## Bad

```python
import subprocess
import sys


def build() -> None:
    subprocess.run([sys.executable, "-m", "build"], check=True)
```

## Good

```python
import subprocess
import sys


def build() -> None:
    subprocess.run([sys.executable, "-m", "compileall", "-q", "src"], check=True)
    subprocess.run([sys.executable, "-m", "build"], check=True)
```

## See Also

- [python-proj-build-artifacts](proj-build-artifacts.md) - building the distributions themselves
- [python-lint-config-committed](lint-config-committed.md) - the CI checks that run alongside the build
