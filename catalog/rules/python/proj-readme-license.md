---
id: python-proj-readme-license
lang: python
prefix: proj
title: Point metadata at the README and declare the license with an SPDX expression
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readme, license, SPDX, metadata]
  files: ["**/*.py"]
  symbols: [tomllib.load]
related: [python-proj-pyproject-metadata]
sources:
  - title: Writing your pyproject.toml - readme and license
    url: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
---

> Point metadata at the README and declare the license with an SPDX expression.

## Why

The guide shows `readme = "README.md"` as the long description shown on the package page, and per PEP 639 a `license` field holding an SPDX expression plus `license-files` globs for the legal files. A project without them presents a bare page and leaves users guessing whether they may use it. Both are read from the artifact's metadata, so they must be declared rather than stored in a loose file.

## Bad

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    project = tomllib.load(handle)["project"]

description = project["description"]  # no readme, no license declared
```

## Good

```python
import tomllib

with open("pyproject.toml", "rb") as handle:
    project = tomllib.load(handle)["project"]

assert project["readme"] == "README.md"
assert project["license"] == "MIT"
```

## See Also

- [python-proj-pyproject-metadata](proj-pyproject-metadata.md) - the rest of the metadata table
