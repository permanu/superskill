---
id: python-style-naming-conventions
lang: python
prefix: style
title: Use CapWords for classes and lowercase_with_underscores for functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, CapWords, snake_case, style]
  files: ["**/*.py"]
  symbols: [class, def]
related: [python-style-leading-underscore]
sources:
  - title: PEP 8 - Style Guide for Python Code
    url: https://peps.python.org/pep-0008/
  - title: Google Python Style Guide
    url: https://google.github.io/styleguide/pyguide.html
---

> Follow PEP 8 naming: CapWords classes, snake_case functions and variables.

## Why

PEP 8 states that class names should normally use the CapWords convention and that function names should be lowercase with words separated by underscores, with variable names following the function convention. The split lets readers tell types from callables and values at a glance, and matches every standard library module. Names are the most-read part of an API.

## Bad

```python
class user_profile:
    def GetName(self) -> str:
        return "name"
```

## Good

```python
class UserProfile:
    def get_name(self) -> str:
        return "name"
```

## See Also

- [python-style-leading-underscore](style-leading-underscore.md) - marking the names that are not public
