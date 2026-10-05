---
id: python-pkg-version-specifiers
lang: python
prefix: pkg
title: Bound compatible upgrades with the compatible release operator
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [compatible release, version specifiers, dependencies, bounds]
  files: ["**/*.py"]
  symbols: [dependencies]
related: [python-pkg-lower-bounds, python-pkg-app-vs-library-pins]
sources:
  - title: Version specifiers
    url: https://packaging.python.org/en/latest/specifications/version-specifiers/
---

> Bound patch-level upgrades with the compatible release operator; ~=0.27.0 admits 0.27.x but not 0.28.0.

## Why

The version specifiers spec defines ~= as a pair of clauses: ~= 0.27.0 is equivalent to >= 0.27.0, == 0.27.*, and its examples state that ~=3.1.2 matches version 3.1.2 or later, but not version 3.2.0 or later. That single operator states the common policy of accepting compatible upgrades without crossing the next release series. Padding the version controls the degree of forward compatibility.

## Bad

```python
def dependencies() -> list[str]:
    return ["httpx>=0.27"]
```

## Good

```python
def dependencies() -> list[str]:
    return ["httpx~=0.27.0"]
```

## See Also

- [python-pkg-lower-bounds](pkg-lower-bounds.md) - when an explicit upper bound is warranted instead
- [python-pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - the policy for exact pins
