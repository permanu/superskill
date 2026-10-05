---
id: python-api-deprecation-warning
lang: python
prefix: api
title: Announce removals with DeprecationWarning and stacklevel=2
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecation, warnings, stacklevel, api]
  files: ["**/*.py"]
  symbols: [warnings.warn, DeprecationWarning]
related: [python-err-warnings-vs-errors, python-obs-stacklevel-wrappers]
sources:
  - title: warnings - Warning control
    url: https://docs.python.org/3/library/warnings.html
---

> Announce removals with DeprecationWarning and stacklevel=2 so callers see the warning at their line.

## Why

The warnings docs describe DeprecationWarning as the category for deprecated features intended for other Python developers, ignored by default except when triggered from __main__. They also explain that stacklevel makes the warning refer to the wrapper's caller rather than the wrapper itself. Naming the category and the stacklevel puts the warning in front of the audience that can act on it.

## Bad

```python
import warnings


def load(path: str) -> str:
    warnings.warn("load() is deprecated", DeprecationWarning)
    return path
```

## Good

```python
import warnings


def load(path: str) -> str:
    warnings.warn("load() is deprecated; use read()", DeprecationWarning, stacklevel=2)
    return path
```

## See Also

- [python-err-warnings-vs-errors](err-warnings-vs-errors.md) - when a condition is a warning instead of an exception
- [python-obs-stacklevel-wrappers](obs-stacklevel-wrappers.md) - the same stacklevel idea for logging
