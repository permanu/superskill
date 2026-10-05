---
id: python-doc-docstring-first-statement
lang: python
prefix: doc
title: Put the docstring first; a later string literal is not a docstring
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [docstring, first statement, __doc__, pydoc]
  files: ["**/*.py"]
  symbols: [__doc__]
related: [python-doc-docstring-public, python-doc-blank-after-summary]
sources:
  - title: PEP 257 - Docstring Conventions
    url: https://peps.python.org/pep-0257/
  - title: Google Python Style Guide
    url: https://google.github.io/styleguide/pyguide.html
---

> Put the docstring first; a string literal after other statements never becomes __doc__.

## Why

PEP 257 defines a docstring as a string literal that occurs as the first statement in a module, function, class, or method definition, and states that it becomes the __doc__ attribute. The Google style guide makes the same point: a docstring is a string that is the first statement in the object. A literal placed after other statements is dead weight that no documentation tool sees.

## Bad

```python
def scale(value: int) -> int:
    factor = 2
    """Scale the value by the factor."""
    return value * factor
```

## Good

```python
def scale(value: int) -> int:
    """Scale the value by the factor."""
    factor = 2
    return value * factor
```

## See Also

- [python-doc-docstring-public](doc-docstring-public.md) - which objects need a docstring in the first place
- [python-doc-blank-after-summary](doc-blank-after-summary.md) - the layout once the docstring is in position
