---
id: python-pkg-requirements-hashes
lang: python
prefix: pkg
title: Install deployments with hashes pinned in the requirements file
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hashes, require-hashes, requirements, security]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-only-binary, python-pkg-constraints-file]
sources:
  - title: pip - Secure installs
    url: https://pip.pypa.io/en/stable/topics/secure-installs/
---

> Use --require-hashes with pinned requirements; hashes protect the install from remote tampering.

## Why

pip's secure installs guide states that pip performs no checks to protect against remote tampering by default and that hash-checking mode uses local hashes embedded in a requirements file for protection. Hashes are required for all requirements and all dependencies, and requirements must be pinned, so the mode forces a complete locked list. The guide names sha256 as the recommended algorithm.

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
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--require-hashes", "-r", requirements],
        check=True,
    )
```

## See Also

- [python-pkg-only-binary](pkg-only-binary.md) - the other secure-install measure
- [python-pkg-constraints-file](pkg-constraints-file.md) - capping versions without adding requirements
