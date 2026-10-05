---
id: python-pkg-dry-run-report
lang: python
prefix: pkg
title: Resolve before installing with pip's dry run and report
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dry-run, report, resolution, pip]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-pip-check, python-pkg-constraints-file]
sources:
  - title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
---

> Preview resolution with --dry-run --report; review what would change before touching the environment.

## Why

The pip install reference documents --dry-run as printing what would be installed without installing anything, and --report as generating a JSON description of the install that combines with --dry-run and --ignore-installed to resolve the requirements. The report shows the versions the resolver chose before they land in the environment. Reviewing it is the supported way to audit an upgrade's effects.

## Bad

```python
import subprocess
import sys


def upgrade(package: str) -> None:
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", package], check=True)
```

## Good

```python
import subprocess
import sys


def upgrade(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--dry-run", "--report", "-",
         "--quiet", "--upgrade", package],
        check=True,
    )
```

## See Also

- [python-pkg-pip-check](pkg-pip-check.md) - verifying the environment after installs
- [python-pkg-constraints-file](pkg-constraints-file.md) - constraining the versions the report shows
