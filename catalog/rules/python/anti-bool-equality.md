---
id: python-anti-bool-equality
lang: python
prefix: anti
title: Test booleans directly; == True and == False add a comparison that reads worse
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [boolean, comparison, condition, style]
  files: ["**/*.py"]
  symbols: [bool]
related: [python-anti-none-equality, python-anti-empty-len]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Test booleans directly; == True and == False add a comparison that reads worse.

## Why

PEP 8 says not to compare boolean values to True or False using ==, because the value already is the condition. Writing == False also obscures the intent to negate, which is spelled not. The direct form reads as the condition itself.

## Bad

```python
def is_enabled(flag: bool) -> str:
    if flag == True:
        return "on"
    return "off"
```

## Good

```python
def is_enabled(flag: bool) -> str:
    if flag:
        return "on"
    return "off"
```

## See Also

- [python-anti-none-equality](anti-none-equality.md) - the singleton comparison PEP 8 rules on
- [python-anti-empty-len](anti-empty-len.md) - testing a value instead of comparing it
