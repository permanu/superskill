---
id: python-style-exception-suffix
lang: python
prefix: style
title: Name exception classes with an Error suffix
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception names, Error, naming, style]
  files: ["**/*.py"]
  symbols: [Exception]
related: [python-err-custom-hierarchy, python-style-naming-conventions]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
---

> Give error exceptions the Error suffix; the name tells readers the class is raised.

## Why

PEP 8 states that class naming conventions apply to exceptions and that you should use the suffix Error on exception names if the exception actually is an error, while non-error exceptions used for flow control need no suffix. The suffix distinguishes failure types from data types at every reference. The standard library follows the same convention, from ValueError to OSError.

## Bad

```python
class ValidationFailed(Exception):
    pass
```

## Good

```python
class ValidationError(Exception):
    pass
```

## See Also

- [python-err-custom-hierarchy](err-custom-hierarchy.md) - structuring the exceptions the names describe
- [python-style-naming-conventions](style-naming-conventions.md) - the class naming rule this extends
