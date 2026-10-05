---
id: python-proj-console-scripts
lang: python
prefix: proj
title: Declare command-line entry points in the scripts table instead of hand-written launchers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [entry points, console_scripts, scripts]
  files: ["**/*.py"]
  symbols: [entry_points]
related: [python-proj-pyproject-metadata]
sources:
  - title: Writing your pyproject.toml - Creating executable scripts
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
  - title: importlib.metadata - Entry points
    url: https://docs.python.org/3/library/importlib.metadata.html
---

> Declare commands in [project.scripts]; installers create the launcher.

## Why

The guide shows a command declared as `spam-cli = "spam:main_cli"` in `[project.scripts]`, after which the installer creates an executable that imports the function and exits with its return value. Hand-written launcher files need executable bits, correct interpreter shebangs, and a place on the path that differs per platform and environment. Declared entry points are discoverable through `importlib.metadata.entry_points()` as well.

## Bad

```python
from pathlib import Path


def write_launcher() -> None:
    launcher = Path("bin") / "spam-cli"
    launcher.write_text("#!/usr/bin/env python3\nfrom spam import main_cli\nmain_cli()\n")
    launcher.chmod(0o755)
```

## Good

```python
from importlib.metadata import entry_points


def load_cli() -> object:
    (script,) = entry_points(group="console_scripts", name="spam-cli")
    return script.load()
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - the table entry points are declared in
