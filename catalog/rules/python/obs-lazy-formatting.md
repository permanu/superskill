---
id: python-obs-lazy-formatting
lang: python
prefix: obs
title: Pass logging arguments separately so message formatting stays lazy
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, format, args, lazy]
  files: ["**/*.py"]
  symbols: [logger.debug, logger.info]
related: [python-obs-module-logger]
sources:
  - title: Logging HOWTO - Logging variable data
    url: https://docs.python.org/3/howto/logging.html
  - title: logging - Logger objects
    url: https://docs.python.org/3/library/logging.html
---

> Pass logging arguments separately so formatting happens only when the record is emitted.

## Why

The logging methods take a format string plus arguments and merge them into the record; the howto shows `logging.warning('%s before you %s', 'Look', 'leap!')` as the way to log variable data. An f-string formats before the call, so every suppressed DEBUG line pays the cost, and the separate values are no longer available to handlers that want structured fields. Deferring also keeps the message template stable for grouping.

## Bad

```python
import logging

logger = logging.getLogger(__name__)


def send(count: int, user: str) -> None:
    logger.debug(f"sent {count} messages to {user}")
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def send(count: int, user: str) -> None:
    logger.debug("sent %s messages to %s", count, user)
```

## See Also

- [python-obs-module-logger](obs-module-logger.md) - the logger these calls go through
