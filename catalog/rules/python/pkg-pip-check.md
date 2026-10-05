---
id: python-pkg-pip-check
lang: python
prefix: pkg
title: Run pip check to catch broken dependency combinations
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pip check, conflicts, environment, dependencies]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-dry-run-report, python-pkg-requirements-hashes]
sources:
  - title: pip check
    url: https://pip.pypa.io/en/stable/cli/pip_check/
  - title: pip - User Guide
    url: https://pip.pypa.io/en/stable/user_guide/
---

> Verify the environment with pip check; the resolver cannot undo earlier installs.

## Why

The pip check reference describes the command as verifying that installed packages have compatible dependencies, and shows exit status 1 with a message when a requirement is missing or has the wrong version. pip's user guide notes that a pip install only considers the packages named in that command and may break already-installed packages. Running the check after installs turns a silent broken environment into a failed step.

## Bad

```python
import subprocess
import sys


def install(requirements: str) -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", requirements], check=True)
```

## Good

```python
import subprocess
import sys


def install(requirements: str) -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", requirements], check=True)
    subprocess.run([sys.executable, "-m", "pip", "check"], check=True)
```

## See Also

- [python-pkg-dry-run-report](pkg-dry-run-report.md) - reviewing resolution before it lands
- [python-pkg-requirements-hashes](pkg-requirements-hashes.md) - pinning the environment the check verifies
