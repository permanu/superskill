---
id: python-mem-resource-warning
lang: python
prefix: mem
title: Turn ResourceWarning into an error in development so unclosed resources fail fast
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ResourceWarning, leak, warnings, development]
  files: ["**/*.py"]
  symbols: [warnings.simplefilter, ResourceWarning]
related: [python-err-context-manager-cleanup, python-err-warnings-vs-errors]
sources:
  - title: Python Development Mode
    url: https://docs.python.org/3/library/devmode.html
  - title: warnings - Warning control
    url: https://docs.python.org/3/library/warnings.html
---

> Enable ResourceWarning as an error in development; unclosed files and sockets then fail fast instead of leaking silently.

## Why

The development-mode docs list ResourceWarning among the warnings that the mode shows by default and give an example in which the warning names the unclosed file object; the same page warns that not closing a resource explicitly can leave it open for far longer than expected and cause severe issues upon exiting Python. The warnings docs describe filters that turn a warning category into an error. Making ResourceWarning an error in development turns a silent leak into a visible failure.

## Bad

```python
def count_lines(path: str) -> int:
    handle = open(path, encoding="utf-8")
    return len(handle.readlines())
```

## Good

```python
import warnings


def enable_checks() -> None:
    warnings.simplefilter("error", ResourceWarning)


def count_lines(path: str) -> int:
    with open(path, encoding="utf-8") as handle:
        return len(handle.readlines())
```

## See Also

- [python-err-context-manager-cleanup](err-context-manager-cleanup.md) - the with statement that closes the resource in the first place
- [python-err-warnings-vs-errors](err-warnings-vs-errors.md) - warnings as an API contract rather than a development filter
