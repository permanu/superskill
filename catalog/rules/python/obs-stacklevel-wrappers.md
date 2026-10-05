---
id: python-obs-stacklevel-wrappers
lang: python
prefix: obs
title: Pass stacklevel in logging wrappers so records point at the caller
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stacklevel, wrapper, line number, helper]
  files: ["**/*.py"]
  symbols: [stacklevel]
related: [python-obs-lazy-formatting]
sources:
  - title: logging - Logger objects, stacklevel
    url: https://docs.python.org/3/library/logging.html
---

> Pass stacklevel=2 in logging wrappers so records point at the caller.

## Why

The logging methods compute the recorded filename, function, and line number from the caller, so a wrapper that logs on behalf of its callers makes every event appear to come from the wrapper's own line. The docs describe `stacklevel` as skipping that many frames so the record names the caller instead. Without it, source attribution and any tooling that groups by location are wrong.

## Bad

```python
import logging

logger = logging.getLogger(__name__)


def warn_deprecated(name: str) -> None:
    logger.warning("deprecated: %s", name)
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def warn_deprecated(name: str) -> None:
    logger.warning("deprecated: %s", name, stacklevel=2)
```

## See Also

- [python-obs-lazy-formatting](obs-lazy-formatting.md) - the other call-shape detail for logger wrappers
