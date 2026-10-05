---
id: python-doc-comments-sentences
lang: python
prefix: doc
title: Write comments as complete sentences with a capital letter and a period
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, sentences, style, documentation]
  files: ["**/*.py"]
  symbols: []
related: [python-doc-comments-current, python-doc-why-not-what]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Write comments as complete sentences with a capital letter and a period.

## Why

PEP 8 states that comments should be complete sentences, with the first word capitalized unless it is an identifier, and that block comments generally consist of complete sentences ending in a period. Sentence-style comments read as prose next to the code and translate better through review. The guide also notes that comments contradicting the code are worse than none.

## Bad

```python
def area(width: int, height: int) -> int:
    # compute the area
    return width * height
```

## Good

```python
def area(width: int, height: int) -> int:
    # Compute the area.
    return width * height
```

## See Also

- [python-doc-comments-current](doc-comments-current.md) - keeping those sentences true as the code changes
- [python-doc-why-not-what](doc-why-not-what.md) - what a sentence-length comment is worth saying
