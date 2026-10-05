---
id: python-pkg-only-binary
lang: python
prefix: pkg
title: Install deployment environments from wheels only
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [only-binary, wheels, sdist, pip]
  files: ["**/*.py"]
  symbols: [pip]
related: [python-pkg-build-isolation, python-pkg-requirements-hashes]
sources:
  - title: pip - Secure installs
    url: https://pip.pypa.io/en/stable/topics/secure-installs/
---

> Prefer wheels in deployments; source installs execute build code and need a compiler.

## Why

pip's secure installs guide lists two measures for a more secure installation mechanism: hash-checking mode and disallowing source distributions with --only-binary :all:. Installing from a source archive runs the project's build backend, which is arbitrary code from the distribution. Wheels are prebuilt, install without executing that backend, and fail fast when no wheel exists instead of falling back to a source build.

## Bad

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--no-binary", ":all:", package],
        check=True,
    )
```

## Good

```python
import subprocess
import sys


def install(package: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--only-binary", ":all:", package],
        check=True,
    )
```

## See Also

- [python-pkg-build-isolation](pkg-build-isolation.md) - how source builds are isolated when they do run
- [python-pkg-requirements-hashes](pkg-requirements-hashes.md) - the other secure-install measure
