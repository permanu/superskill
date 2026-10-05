---
id: python-anti-type-equality
lang: python
prefix: anti
title: Test types with isinstance, not type equality
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type, isinstance, comparison, subclass]
  files: ["**/*.py"]
  symbols: [isinstance, type]
related: [python-api-abc-interface, python-api-singledispatch]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
  - title: abc - Abstract Base Classes
    url: https://docs.python.org/3/library/abc.html
---

> Test types with isinstance, not type equality; exact-type checks reject subclasses and proxies.

## Why

PEP 8 states that object type comparisons should always use isinstance() instead of comparing types directly. An exact-type check rejects subclasses and classes registered as virtual subclasses, while isinstance follows the hierarchy and honors ABC registration. The equality form also answers False for bool checked against int, where isinstance answers True.

## Bad

```python
def describe(value: object) -> str:
    if type(value) == int:
        return "integer"
    return "other"
```

## Good

```python
def describe(value: object) -> str:
    if isinstance(value, int):
        return "integer"
    return "other"
```

## See Also

- [python-api-abc-interface](api-abc-interface.md) - declaring the interfaces that isinstance consults
- [python-api-singledispatch](api-singledispatch.md) - replacing the whole isinstance ladder
