---
id: python-anti-empty-len
lang: python
prefix: anti
title: Test emptiness with the value itself, not len(seq) == 0
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [len, empty, sequence, truthiness]
  files: ["**/*.py"]
  symbols: [len]
related: [python-anti-bool-equality]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Test emptiness with the value itself; len(seq) == 0 is longer and slower to read.

## Why

PEP 8 says that for sequences such as strings, lists, and tuples, empty sequences are false, so the length comparison is redundant. The comparison also computes a length where the object's truth value already carries the answer. The idiomatic form reads as the question the code is asking.

## Bad

```python
def summarize(items: list[str]) -> str:
    if len(items) == 0:
        return "empty"
    return "items"
```

## Good

```python
def summarize(items: list[str]) -> str:
    if not items:
        return "empty"
    return "items"
```

## See Also

- [python-anti-bool-equality](anti-bool-equality.md) - the other case where a value already is the condition
