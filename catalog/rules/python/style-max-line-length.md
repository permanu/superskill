---
id: python-style-max-line-length
lang: python
prefix: style
title: Wrap long lines to the limit the team agreed on
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [line length, wrapping, style, readability]
  files: ["**/*.py"]
  symbols: []
related: [python-style-import-single-line]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Wrap lines at the agreed limit; long lines force horizontal scrolling in every review.

## Why

PEP 8 states that all lines should be limited to a maximum of 79 characters and that a team which agrees on the issue can raise the limit up to 99, provided comments and docstrings stay wrapped at 72. A consistent limit lets several files sit side by side and keeps review tools readable. Wrapping uses implicit continuation inside parentheses rather than backslashes.

## Bad

```python
def describe(name: str, count: int) -> str:
    return f"{name} has {count} items and this single line keeps going well past the point where the reader loses track of it"
```

## Good

```python
def describe(name: str, count: int) -> str:
    return (
        f"{name} has {count} items and this line is wrapped "
        "so it stays within the configured limit"
    )
```

## See Also

- [python-style-import-single-line](style-import-single-line.md) - another rule that keeps lines short
