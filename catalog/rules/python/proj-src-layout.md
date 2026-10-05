---
id: python-proj-src-layout
lang: python
prefix: proj
title: Keep importable code under src so tests exercise the installed package
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [src layout, import shadowing, editable install]
  files: ["**/*.py"]
  symbols: [sys.path]
related: [python-proj-venv-per-project]
sources:
  - title: src layout vs flat layout
    url: https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
---

> Put importable code under src/ so the installed package is what runs.

## Why

The packaging guide explains that the interpreter puts the current directory first on the import path, so a flat layout lets the in-development copy shadow the installed distribution and hide packaging mistakes such as files missing from the wheel. A src layout requires installation to run the code, and it keeps an editable install from exposing README or config files as importable modules. Tests then import what users will get.

## Bad

```python
from pathlib import Path

ROOT = Path(__file__).parent
assert (ROOT / "awesome_package").is_dir()  # package at the repository root
```

## Good

```python
from pathlib import Path

ROOT = Path(__file__).parent
assert (ROOT / "src" / "awesome_package").is_dir()  # importable code under src/
```

## See Also

- [python-proj-venv-per-project](proj-venv-per-project.md) - installing the project into its own environment
