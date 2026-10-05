---
id: python-anti-none-equality
lang: python
prefix: anti
title: Compare to None with is and is not, never the equality operators
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [None, comparison, identity, style]
  files: ["**/*.py"]
  symbols: [None]
related: [python-anti-bool-equality, python-anti-is-literal]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Compare to None with is and is not; == None can be overridden and hides intent.

## Why

PEP 8 states that comparisons to singletons like None should always be done with is or is not, never the equality operators. A class can override __eq__ and give the comparison a different meaning, while identity cannot be overridden. The identity form also makes the intent to test for the singleton explicit.

## Bad

```python
def normalize(value: str | None) -> str:
    if value == None:
        return ""
    return value
```

## Good

```python
def normalize(value: str | None) -> str:
    if value is None:
        return ""
    return value
```

## See Also

- [python-anti-bool-equality](anti-bool-equality.md) - the other comparison PEP 8 settles directly
- [python-anti-is-literal](anti-is-literal.md) - where identity is the wrong operator
