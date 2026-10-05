---
id: python-style-property-not-getter
lang: python
prefix: style
title: Expose simple attributes directly instead of getter methods
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [property, getter, attributes, style]
  files: ["**/*.py"]
  symbols: [property]
related: [python-style-return-consistency, python-api-return-copy]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Use plain attributes and properties, not get_ and set_ methods, for simple data.

## Why

PEP 8 states that for simple public data attributes it is best to expose the attribute name without complicated accessor or mutator methods, and that if the attribute later needs behavior, a property can hide it behind the same access syntax. The accessor methods add call syntax that Python does not need. A property keeps the change invisible to callers.

## Bad

```python
class Config:
    def __init__(self, path: str) -> None:
        self._path = path

    def get_path(self) -> str:
        return self._path
```

## Good

```python
class Config:
    def __init__(self, path: str) -> None:
        self.path = path
```

## See Also

- [python-style-return-consistency](style-return-consistency.md) - another convention PEP 8 settles for simple bodies
- [python-api-return-copy](api-return-copy.md) - what to do when the attribute is mutable state
