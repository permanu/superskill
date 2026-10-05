---
id: python-doc-comments-current
lang: python
prefix: doc
title: Update comments with the code; a stale comment is worse than none
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, stale, review, documentation]
  files: ["**/*.py"]
  symbols: []
related: [python-doc-comments-sentences, python-doc-why-not-what]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Update comments with the code; a stale comment is worse than no comment.

## Why

PEP 8 states that comments which contradict the code are worse than no comments and asks authors to keep comments up to date when the code changes. A comment that names the wrong count, unit, or behavior sends readers to the wrong conclusion with the authority of documentation. Reviewers should treat comment changes as part of the code change.

## Bad

```python
def retries() -> int:
    # Retry three times.
    return 5
```

## Good

```python
def retries() -> int:
    # Retry five times.
    return 5
```

## See Also

- [python-doc-comments-sentences](doc-comments-sentences.md) - the shape comments take once they are current
- [python-doc-why-not-what](doc-why-not-what.md) - what belongs in the comment at all
