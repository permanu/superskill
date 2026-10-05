---
id: python-err-logging-exception
lang: python
prefix: err
title: Log a handled exception with logger.exception so its traceback survives
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, exception, traceback, handler, boundary]
  files: ["**/*.py"]
  symbols: [logging.exception, exc_info]
related: [python-err-reraise-bare, python-err-warnings-vs-errors]
sources:
  - title: logging - Logger objects, exception()
    url: https://docs.python.org/3/library/logging.html
  - title: Python Tutorial - Handling Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
---

> Log handled exceptions with logger.exception; logger.error(str(exc)) drops the traceback.

## Why

`logger.exception` records the message at error level and attaches the active exception, so the log carries the full traceback and cause chain. Formatting `str(exc)` into a message loses the frames that show where the failure started. At a boundary, log once and either re-raise or convert; logging the same failure at every level multiplies noise without adding information.

## Bad

```python
import logging

logger = logging.getLogger(__name__)


def send(payload: dict[str, str]) -> None:
    raise OSError("connection reset")


def sync(payload: dict[str, str]) -> None:
    try:
        send(payload)
    except OSError as exc:
        logger.error(f"sync failed: {exc}")
```

## Good

```python
import logging

logger = logging.getLogger(__name__)


def send(payload: dict[str, str]) -> None:
    raise OSError("connection reset")


def sync(payload: dict[str, str]) -> None:
    try:
        send(payload)
    except OSError:
        logger.exception("sync failed")
        raise
```

## See Also

- [python-err-reraise-bare](err-reraise-bare.md) - propagating after the log entry is written
- [python-err-warnings-vs-errors](err-warnings-vs-errors.md) - routing warnings into the same logging pipeline
