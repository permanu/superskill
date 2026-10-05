---
id: python-pkg-env-markers
lang: python
prefix: pkg
title: Express platform conditions with environment markers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [environment markers, sys_platform, dependencies, packaging]
  files: ["**/*.py"]
  symbols: [sys_platform]
related: [python-pkg-lower-bounds, python-pkg-no-direct-urls]
sources:
  - title: Dependency specifiers
    url: https://packaging.python.org/en/latest/specifications/dependency-specifiers/
---

> Put platform conditions in the dependency string as markers; the installer evaluates them per environment.

## Why

The dependency specifiers spec states that environment markers allow a dependency specification to provide a rule that describes when the dependency should be used, and gives pywin32; sys_platform == "win32" as the example. The marker is evaluated by the installer for the target environment, so one metadata file serves every platform. Branching in packaging code cannot affect what the installer resolves, and it splits the dependency list into paths that tests may never cover.

## Bad

```python
import sys


def platform_dependencies() -> list[str]:
    if sys.platform == "win32":
        return ["pywin32"]
    return []
```

## Good

```python
def platform_dependencies() -> list[str]:
    return ["pywin32; sys_platform == 'win32'"]
```

## See Also

- [python-pkg-lower-bounds](pkg-lower-bounds.md) - choosing the version bounds those dependencies carry
- [python-pkg-no-direct-urls](pkg-no-direct-urls.md) - the other metadata rule for dependencies
