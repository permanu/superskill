---
id: python-doc-closing-quotes
lang: python
prefix: doc
title: Put the closing quotes of a multi-line docstring on their own line
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, quotes, formatting, PEP 257]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-blank-after-summary]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Put the closing quotes of a multi-line docstring on their own line.

## Why

PEP 257 states that unless the entire docstring fits on one line, the closing quotes go on a line by themselves; PEP 8 shows the same layout. The separate line keeps the body's last line at the docstring's indentation, which matters for tools that rewrap text and for uniform diffs. One-line docstrings keep their quotes on the same line.

## Bad

```python
def retry() -> None:
    """Retry the request.

    Waits one second between attempts."""
    print("retry")
```

## Good

```python
def retry() -> None:
    """Retry the request.

    Waits one second between attempts.
    """
    print("retry")
```

## See Also

- [python-doc-blank-after-summary](doc-blank-after-summary.md) - the layout rule for the docstring's second line
