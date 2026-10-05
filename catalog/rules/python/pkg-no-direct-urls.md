---
id: python-pkg-no-direct-urls
lang: python
prefix: pkg
title: Depend on versions, not direct URLs, in published metadata
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [direct references, URLs, dependencies, publishing]
  files: ["**/*.py"]
  symbols: [dependencies]
related: [python-pkg-lower-bounds, python-pkg-app-vs-library-pins]
sources:
  - title: Version specifiers
    url: https://packaging.python.org/en/latest/specifications/version-specifiers/
---

> Published dependencies should name versions; direct URL references belong to integrators, not indexes.

## Why

The version specifiers spec states that public index servers should not allow direct references in uploaded distributions and that direct references are intended as a tool for software integrators rather than publishers. A URL dependency ties every install to one location, bypasses index-side version resolution, and skips the security fixes a version range would receive. Version specifiers let the installer choose the source while the metadata stays portable.

## Bad

```python
def dependencies() -> list[str]:
    return ["mylib @ https://example.com/mylib-1.0.0-py3-none-any.whl"]
```

## Good

```python
def dependencies() -> list[str]:
    return ["mylib>=1.0"]
```

## See Also

- [python-pkg-lower-bounds](pkg-lower-bounds.md) - the bounds that replace the URL pin
- [python-pkg-app-vs-library-pins](pkg-app-vs-library-pins.md) - where URL-style requirements are acceptable instead
