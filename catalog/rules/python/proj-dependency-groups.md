---
id: python-proj-dependency-groups
lang: python
prefix: proj
title: Put lint and test tools in dependency groups instead of runtime dependencies
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dependency-groups, dev dependencies, pytest]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-optional-extras]
sources:
  - title: Dependency Groups specification
    url: https://packaging.python.org/en/latest/specifications/dependency-groups/
---

> Put lint and test tools in dependency groups, not runtime dependencies.

## Why

The Dependency Groups specification defines these requirements as not included in built package metadata, and calls them suitable for internal development use cases such as linting and testing. Test runners listed in `dependencies` are installed for every user and every deployment, and they become part of the public dependency contract. A `test` group keeps them out of the artifact while still installable for development.

## Bad

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    project = tomllib.load(handle)["project"]

assert "pytest" in project["dependencies"]  # test tool ships to users
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    groups = tomllib.load(handle)["dependency-groups"]

assert "pytest" in groups["test"]
```

## See Also

- [python-proj-optional-extras](proj-optional-extras.md) - the user-facing counterpart for optional features
