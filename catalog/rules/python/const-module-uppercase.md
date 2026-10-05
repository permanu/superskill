---
id: python-const-module-uppercase
lang: python
prefix: const
title: Define constants at module level in UPPERCASE
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constants, UPPERCASE, module level, naming]
  files: ["**/*.py"]
  symbols: []
related: [python-type-final-classvar, python-style-naming-conventions]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Name module-level constants in UPPERCASE; the case marks the value as fixed.

## Why

PEP 8 states that constants are usually defined at a module level and written in all capital letters with underscores separating words. The casing is the signal that a name is a value rather than a variable: readers stop looking for assignments to it. Lowercase names make tuning knobs look like local state.

## Bad

```python
default_timeout = 30


def wait(seconds: int = default_timeout) -> None:
    print(seconds)
```

## Good

```python
DEFAULT_TIMEOUT = 30


def wait(seconds: int = DEFAULT_TIMEOUT) -> None:
    print(seconds)
```

## See Also

- [python-type-final-classvar](type-final-classvar.md) - marking constants so rebinding is checked
- [python-style-naming-conventions](style-naming-conventions.md) - the naming rules around this case
