---
id: python-proj-venv-per-project
lang: python
prefix: proj
title: Install dependencies into a per-project virtual environment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [venv, virtual environment, dependencies, isolation]
  files: ["**/*.py"]
  symbols: [sys.prefix, sys.base_prefix]
related: [python-proj-python-m-invocation, python-proj-src-layout]
sources:
  - title: Python Tutorial - Virtual Environments and Packages
    url: https://docs.python.org/3/tutorial/venv.html
---

> Install dependencies into a per-project virtual environment.

## Why

The tutorial frames the problem directly: applications need conflicting library versions, so each gets a self-contained environment instead of fighting over the system interpreter. A project-local `.venv` makes dependency state reproducible and keeps installs from modifying the interpreter the operating system manages. The environment is created once with `python -m venv .venv` and then used by every tool for that project.

## Bad

```python
import sys


def in_virtualenv() -> bool:
    return sys.prefix != sys.base_prefix


def install() -> None:
    if not in_virtualenv():
        print("installing into the system interpreter anyway")
```

## Good

```python
import sys


def require_virtualenv() -> None:
    if sys.prefix == sys.base_prefix:
        raise RuntimeError("run inside a project virtual environment")


require_virtualenv()
```

## See Also

- [python-proj-python-m-invocation](proj-python-m-invocation.md) - using the environment's interpreter for tools
- [python-proj-src-layout](proj-src-layout.md) - installing the project itself into that environment
