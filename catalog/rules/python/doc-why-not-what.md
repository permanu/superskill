---
id: python-doc-why-not-what
lang: python
prefix: doc
title: Use comments to explain why, not to narrate what the code does
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, why, readability, documentation]
  files: ["**/*.py"]
  symbols: []
related: [python-doc-comments-sentences, python-doc-comments-current]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Use comments to explain why, not to narrate what the code plainly does.

## Why

PEP 8 gives the exact contrast: an inline comment such as "# Increment x" on x = x + 1 states the obvious and is distracting, while "# Compensate for border" records the reason the line exists. The code already says what happens; the comment is the place for context the code cannot carry. The guide says inline comments should be used sparingly for that reason.

## Bad

```python
def compensate(value: int) -> int:
    value = value + 1  # Increment value
    return value
```

## Good

```python
def compensate(value: int) -> int:
    value = value + 1  # Compensate for border
    return value
```

## See Also

- [python-doc-comments-sentences](doc-comments-sentences.md) - the shape those reasons take
- [python-doc-comments-current](doc-comments-current.md) - keeping the reasons true
