---
id: python-anti-lambda-assignment
lang: python
prefix: anti
title: Bind functions with def, not by assigning a lambda to a name
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lambda, def, naming, traceback]
  files: ["**/*.py"]
  symbols: [lambda]
related: [python-perf-sort-key]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Bind functions with def, not lambda assignment; the def form has a name and a traceback.

## Why

PEP 8 states the rule directly: always use a def statement instead of an assignment statement that binds a lambda expression directly to an identifier. The docs' reason is that def names the function object, while a lambda assigned this way shows as <lambda> in tracebacks and representations. The def form also has a place for a docstring.

## Bad

```python
def apply(values: list[int]) -> list[int]:
    double = lambda value: value * 2
    return [double(value) for value in values]
```

## Good

```python
def double(value: int) -> int:
    return value * 2


def apply(values: list[int]) -> list[int]:
    return [double(value) for value in values]
```

## See Also

- [python-perf-sort-key](perf-sort-key.md) - where an inline lambda is the right tool
