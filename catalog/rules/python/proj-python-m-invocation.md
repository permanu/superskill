---
id: python-proj-python-m-invocation
lang: python
prefix: proj
title: Invoke pip and tooling as python -m so the active interpreter is used
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [python -m, pip, sys.executable, tools]
  files: ["**/*.py"]
  symbols: [sys.executable, subprocess.run]
related: [python-proj-venv-per-project, python-proj-build-artifacts]
sources:
  - title: Python Tutorial - Managing Packages with pip
    url: https://docs.python.org/3/tutorial/venv.html
  - title: Packaging Python Projects - Installing packages
    url: https://packaging.python.org/en/latest/tutorials/packaging-projects/
---

> Invoke pip and tools as python -m to use the active interpreter.

## Why

The venv tutorial and the packaging tutorial both run tools as `python -m pip`, which binds the command to the interpreter that is currently active, including a virtual environment. A bare `pip` resolves through `PATH` and can be a different interpreter's pip, installing into an environment the project is not using. Naming `sys.executable` makes that binding explicit in code that shells out.

## Bad

```python
import subprocess


def install(package: str) -> None:
    subprocess.run(["pip", "install", package], check=True)
```

## Good

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)
```

## See Also

- [python-proj-venv-per-project](proj-venv-per-project.md) - the environment this invocation targets
- [python-proj-build-artifacts](proj-build-artifacts.md) - the same pattern for builds
