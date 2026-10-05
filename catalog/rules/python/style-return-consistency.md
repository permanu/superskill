---
id: python-style-return-consistency
lang: python
prefix: style
title: Be consistent in return statements
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [return, None, consistency, style]
  files: ["**/*.py"]
  symbols: [return]
related: [python-style-property-not-getter]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Return an expression everywhere or nowhere; write bare returns as return None.

## Why

PEP 8 states that either all return statements in a function should return an expression or none should, and that when some returns carry a value, a value-less return should be written as return None. The mixed form makes readers wonder whether None is intentional or forgotten. The explicit form answers the question at the line.

## Bad

```python
def find(values: list[int], target: int) -> int | None:
    if target in values:
        return values.index(target)
    return
```

## Good

```python
def find(values: list[int], target: int) -> int | None:
    if target in values:
        return values.index(target)
    return None
```

## See Also

- [python-style-property-not-getter](style-property-not-getter.md) - the other simple convention PEP 8 settles for function bodies
