---
id: python-const-env-snapshot
lang: python
prefix: const
title: Read the environment once at startup into configuration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [environment, configuration, os.environ, startup]
  files: ["**/*.py"]
  symbols: [os.environ]
related: [python-const-module-uppercase, python-proj-venv-per-project]
sources:
  - title: os - Miscellaneous operating system interfaces
    url: https://docs.python.org/3/library/os.html
---

> Read the environment once at startup; os.environ is captured at import and never refreshes.

## Why

The os docs state that os.environ is captured the first time the os module is imported and that changes made after that time are not reflected, except through direct modifications of the mapping. Reading variables at arbitrary call sites therefore still returns import-time values while scattering where configuration is required. Loading them once into named values makes the dependency visible and fails fast when a value is missing.

## Bad

```python
import os


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


def port() -> int:
    return int(os.environ.get("PORT", "0"))
```

## Good

```python
import os


def load_config() -> dict[str, str]:
    return {
        "database_url": os.environ["DATABASE_URL"],
        "port": os.environ["PORT"],
    }
```

## See Also

- [python-const-module-uppercase](const-module-uppercase.md) - naming the loaded values
- [python-proj-venv-per-project](proj-venv-per-project.md) - the environment the process starts in
