---
id: python-style-whitespace-operators
lang: python
prefix: style
title: Space operators and keyword defaults the way PEP 8 prescribes
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [whitespace, operators, defaults, style]
  files: ["**/*.py"]
  symbols: []
related: [python-style-naming-conventions]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Spaces around binary operators; no spaces around the equals of a keyword default.

## Why

PEP 8 states that binary operators are surrounded by a single space on either side, and that no spaces go around the = sign that marks a keyword argument or an unannotated default, while an annotated default keeps the spaces. The distinction separates a comparison from an assignment and keeps signatures compact. Slices follow the colon rules of the same section.

## Bad

```python
def scale(value: int, factor: int=2) -> int:
    return value*factor -1
```

## Good

```python
def scale(value: int, factor: int = 2) -> int:
    return value * factor - 1
```

## See Also

- [python-style-naming-conventions](style-naming-conventions.md) - the other PEP 8 conventions for signatures
