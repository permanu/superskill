---
id: python-pkg-editable-install
lang: python
prefix: pkg
title: Install the project editable for development
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [editable, develop, pip, development]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-proj-venv-per-project, python-pkg-build-isolation]
sources:
  - title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
---

> Install the project editable for development; a regular install copies code and hides later edits.

## Why

The pip install reference documents -e/--editable as installing a project in editable mode from a local project path or a VCS URL. An editable install links the working tree into the environment, so edits take effect without reinstalling. A plain install copies the built distribution instead, so the code that runs diverges from the checkout as soon as the next edit lands.

## Bad

```python
import subprocess
import sys


def setup() -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", "."], check=True)
```

## Good

```python
import subprocess
import sys


def setup() -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", "-e", "."], check=True)
```

## See Also

- [python-proj-venv-per-project](proj-venv-per-project.md) - the environment the editable install belongs to
- [python-pkg-build-isolation](pkg-build-isolation.md) - how the project is built when it is not editable
