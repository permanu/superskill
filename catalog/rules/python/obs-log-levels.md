---
id: python-obs-log-levels
lang: python
prefix: obs
title: Choose log levels by the documented meanings, not by how alarming the code feels
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [level, debug, info, warning, error]
  files: ["**/*.py"]
  symbols: [logger.debug, logger.warning]
related: [python-obs-module-logger]
sources:
  - title: Logging HOWTO - Logging Levels
    url: https://docs.python.org/3/howto/logging.html
---

> Choose levels by their documented meanings; the default threshold is WARNING.

## Why

The howto defines each level: DEBUG for diagnosis, INFO for normal operation, WARNING for unexpected-but-working, ERROR for a failed function, CRITICAL for a program that may not continue. Logging routine starts at WARNING trains operators to ignore warnings, and logging failures at INFO hides them below the default threshold. Level meaning is the only filter users have before reading the message.

## Bad

```python
import logging

logger = logging.getLogger(__name__)


def fetch(user: str) -> None:
    logger.warning("starting fetch")  # routine event at warning level
    logger.info("user %s not found", user)  # failure below the default threshold
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def fetch(user: str) -> None:
    logger.debug("starting fetch for %s", user)
    logger.warning("user %s not found", user)
```

## See Also

- [python-obs-module-logger](obs-module-logger.md) - where those records are emitted from
