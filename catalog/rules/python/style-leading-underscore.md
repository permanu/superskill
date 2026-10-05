---
id: python-style-leading-underscore
lang: python
prefix: style
title: Mark non-public names with a single leading underscore
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [underscore, private, attributes, style]
  files: ["**/*.py"]
  symbols: [__all__]
related: [python-style-naming-conventions, python-api-all-public]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Use one leading underscore for non-public attributes; public names carry none.

## Why

PEP 8 states that one leading underscore marks non-public methods and instance variables, and that public attributes should have no leading underscores. The underscore is the module's promise boundary: everything else may be imported and relied on by users. Leaving internal caches and helpers public invites dependencies the package cannot break.

## Bad

```python
class Client:
    def __init__(self) -> None:
        self.cache: dict[str, str] = {}
```

## Good

```python
class Client:
    def __init__(self) -> None:
        self._cache: dict[str, str] = {}
```

## See Also

- [python-style-naming-conventions](style-naming-conventions.md) - the naming rules for the public side
- [python-api-all-public](api-all-public.md) - declaring the public surface of a module
