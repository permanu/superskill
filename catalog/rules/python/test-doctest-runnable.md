---
id: python-test-doctest-runnable
lang: python
prefix: test
title: Keep docstring examples runnable so doctest executes them as tests
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doctest, docstring, examples, executable]
  files: ["**/*.py"]
  symbols: [doctest.testmod]
related: [python-test-one-behavior]
sources:
  - title: doctest - Test interactive Python examples
    url: https://docs.python.org/3/library/doctest.html
---

> Keep docstring examples runnable so doctest executes them as tests.

## Why

An example in a docstring is documentation that can silently drift from the code. doctest searches docstrings for interactive sessions and executes them, so the documented behavior is verified on every run. A stale example is worse than none because readers trust it.

## Bad

```python
def normalize(text: str) -> str:
    """Collapse whitespace.

    >>> normalize("  a  b ")
    'a  b'
    """
    return " ".join(text.split())
```

## Good

```python
def normalize(text: str) -> str:
    """Collapse whitespace.

    >>> normalize("  a  b ")
    'a b'
    """
    return " ".join(text.split())


if __name__ == "__main__":
    import doctest

    doctest.testmod()
```

## See Also

- [python-test-one-behavior](test-one-behavior.md) - keeping each executed example focused on one behavior
