---
id: python-proj-build-artifacts
lang: python
prefix: proj
title: Build distributions with python -m build instead of invoking setup.py directly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [build, wheel, sdist, dist]
  files: ["**/*.py"]
  symbols: [subprocess.run]
related: [python-proj-build-system-pinned, python-proj-python-m-invocation]
sources:
  - title: Packaging Python Projects - Generating distribution archives
    url: https://packaging.python.org/en/latest/tutorials/packaging-projects/
---

> Build distributions with python -m build; setup.py commands skip the standard flow.

## Why

The packaging tutorial builds with `python3 -m build`, which reads `[build-system]`, installs the declared backend in an isolated environment, and writes both the sdist and the wheel to `dist/`. Calling `setup.py sdist bdist_wheel` directly bypasses the declared backend and the isolation, so the artifact can differ from what a frontend would produce. The built wheel is then what should be installed and tested in a clean environment.

## Bad

```python
import subprocess


def build() -> None:
    subprocess.run(["python", "setup.py", "sdist", "bdist_wheel"], check=True)
```

## Good

```python
import subprocess
import sys


def build() -> None:
    subprocess.run([sys.executable, "-m", "build"], check=True)
```

## See Also

- [python-proj-build-system-pinned](proj-build-system-pinned.md) - the backend this command honors
- [python-proj-python-m-invocation](proj-python-m-invocation.md) - why the interpreter is named explicitly
