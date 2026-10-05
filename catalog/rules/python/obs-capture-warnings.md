---
id: python-obs-capture-warnings
lang: python
prefix: obs
title: Route warnings into logging so they share the application's event stream
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [captureWarnings, warnings, py.warnings]
  files: ["**/*.py"]
  symbols: [logging.captureWarnings]
related: [python-obs-dictconfig, python-err-warnings-vs-errors]
sources:
  - title: logging - Integration with the warnings module
    url: https://docs.python.org/3/library/logging.html
  - title: warnings - Warning control
    url: https://docs.python.org/3/library/warnings.html
---

> Route warnings into logging so they share the application's event stream.

## Why

Both docs describe the same integration: `logging.captureWarnings(True)` sends warnings to the `py.warnings` logger instead of printing them to stderr. Deprecations and runtime warnings then carry timestamps and levels like every other event, and they can be filtered or shipped to a collector. Without it they bypass configuration and vanish under default filters.

## Bad

```python
import logging


def setup() -> None:
    logging.basicConfig(level=logging.INFO)
```

## Good

```python
import logging


def setup() -> None:
    logging.basicConfig(level=logging.INFO)
    logging.captureWarnings(True)
```

## See Also

- [python-obs-dictconfig](obs-dictconfig.md) - the configuration that captures the redirected records
- [python-err-warnings-vs-errors](err-warnings-vs-errors.md) - deciding what should warn in the first place
