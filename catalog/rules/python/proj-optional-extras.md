---
id: python-proj-optional-extras
lang: python
prefix: proj
title: Expose optional features as extras instead of unconditional dependencies
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional-dependencies, extras, features]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-dependency-groups]
sources:
  - title: Writing your pyproject.toml - optional-dependencies
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Expose optional features as extras, not unconditional dependencies.

## Why

The guide says to put dependencies that are only needed for a specific feature under `optional-dependencies`, where each key becomes an extra installable as `pip install your-project[gui]`. Listing a GUI stack or database driver in `dependencies` forces it on every user, including servers that will never use it. Extras let each deployment choose the features it needs.

## Bad

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    dependencies = tomllib.load(handle)["project"]["dependencies"]

assert "PyQt5" in dependencies  # GUI stack forced on every install
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    extras = tomllib.load(handle)["project"]["optional-dependencies"]

assert "PyQt5" in extras["gui"]
```

## See Also

- [python-proj-dependency-groups](proj-dependency-groups.md) - keeping internal tooling out of the artifact entirely
