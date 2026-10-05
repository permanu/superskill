---
id: python-proj-pyproject-metadata
lang: python
prefix: proj
title: Declare project metadata in the pyproject project table instead of setup.py
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pyproject, metadata, setup.py, project table]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-build-system-pinned]
sources:
  - title: Writing your pyproject.toml
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Declare project metadata in the pyproject [project] table, not setup.py.

## Why

The packaging guide states that for new projects the `[project]` table is the format most build backends use for name, version, dependencies, and the rest, and that `setup.py` stays only when programmatic configuration such as building C extensions is needed. Declarative metadata can be read by tools without executing project code, and it lives in one file. A `setup.py` that runs arbitrary code at build time is harder to audit and easier to break.

## Bad

```python
def legacy_metadata() -> dict[str, object]:
    return {"name": "spam-eggs", "version": "1.0", "install_requires": ["httpx"]}
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    project = tomllib.load(handle)["project"]

assert project["name"] == "spam-eggs"
assert project["dependencies"] == ["httpx"]
```

## See Also

- [python-proj-build-system-pinned](proj-build-system-pinned.md) - the build-system table that pairs with this metadata
