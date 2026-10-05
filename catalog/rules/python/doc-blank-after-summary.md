---
id: python-doc-blank-after-summary
lang: python
prefix: doc
title: Separate a multi-line docstring's summary from the body with a blank line
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, summary, blank line, formatting]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-closing-quotes, python-doc-summary-imperative]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: The Python Tutorial - More Control Flow Tools
    url: https://docs.python.org/3/tutorial/controlflow.html
---

> Separate a multi-line docstring's summary from the body with a blank line.

## Why

PEP 257 states that multi-line docstrings consist of a summary line followed by a blank line followed by a more elaborate description, and that the summary must fit on one line and be separated from the rest by a blank line. The tutorial repeats the convention for the second line. Tools that extract the summary rely on that boundary.

## Bad

```python
def fetch(url: str) -> bytes:
    """Fetch a URL.
    The response is returned as bytes.
    """
    return b""
```

## Good

```python
def fetch(url: str) -> bytes:
    """Fetch a URL.

    The response is returned as bytes.
    """
    return b""
```

## See Also

- [python-doc-closing-quotes](doc-closing-quotes.md) - the other layout rule for multi-line docstrings
- [python-doc-summary-imperative](doc-summary-imperative.md) - what the summary line itself should say
