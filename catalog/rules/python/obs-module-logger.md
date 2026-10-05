---
id: python-obs-module-logger
lang: python
prefix: obs
title: Create one module-level logger with getLogger name and log through it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logger, getLogger, module, hierarchy]
  files: ["**/*.py"]
  symbols: [logging.getLogger]
related: [python-obs-library-null-handler]
sources:
  - title: Logging HOWTO - Loggers
    url: https://docs.python.org/3/howto/logging.html
---

> Create one module-level logger with getLogger(__name__) and log through it.

## Why

The howto states the convention directly: a module-level logger named with `__name__` tracks the package hierarchy, so events are attributable to their source and verbosity can be configured per module. Calling `logging.info` and friends uses the root logger, which makes the source anonymous and gives the application no handle for filtering. Repeated `getLogger(__name__)` calls return the same object, so the module-level name is a cached lookup.

## Bad

```python
import logging


def process(order_id: str) -> None:
    logging.info("processing %s", order_id)
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def process(order_id: str) -> None:
    logger.info("processing %s", order_id)
```

## See Also

- [python-obs-library-null-handler](obs-library-null-handler.md) - what a library does with that logger
