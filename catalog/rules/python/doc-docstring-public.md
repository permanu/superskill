---
id: python-doc-docstring-public
lang: python
prefix: doc
title: Docstring public modules, classes, and functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, public API, help, documentation]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-module-docstring, python-doc-summary-imperative]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Docstring public modules, classes, and functions; the docstring is the API's help text.

## Why

PEP 257 states that all modules should normally have docstrings and that all functions and classes exported by a module should also have docstrings. PEP 8 repeats the rule for public modules, functions, classes, and methods. The docstring is what help() and pydoc surface, so an undocumented public callable is invisible in the tooling users already have.

## Bad

```python
def parse(text: str) -> list[str]:
    return text.split()
```

## Good

```python
def parse(text: str) -> list[str]:
    """Split text into whitespace-separated fields."""
    return text.split()
```

## See Also

- [python-doc-module-docstring](doc-module-docstring.md) - the module-level case of the same rule
- [python-doc-summary-imperative](doc-summary-imperative.md) - how the summary line should read
