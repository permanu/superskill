---
id: python-pkg-index-config
lang: python
prefix: pkg
title: Point installs at one controlled index; extra-index-url invites confusion
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [index-url, extra-index-url, dependency confusion, pip]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-requirements-hashes, python-pkg-only-binary]
sources:
  - title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
---

> Use a single index URL; --extra-index-url lets a public package shadow your private one.

## Why

The pip install reference warns that using --extra-index-url to search for packages not in the main repository is unsafe, calling it dependency confusion: an attacker can publish a package with the same name to a public index, which may then be chosen instead of the private package. A single controlled index that proxies both sources keeps one resolution order and one name space. The same page documents --index-url as the base URL of the package index.

## Bad

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install",
         "--extra-index-url", "https://internal.example/simple", package],
        check=True,
    )
```

## Good

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install",
         "--index-url", "https://internal.example/simple", package],
        check=True,
    )
```

## See Also

- [python-pkg-requirements-hashes](pkg-requirements-hashes.md) - the other tamper-resistance measure
- [python-pkg-only-binary](pkg-only-binary.md) - avoiding build-time code in deployments
