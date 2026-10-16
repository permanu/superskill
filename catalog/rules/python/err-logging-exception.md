---
id: python-err-logging-exception
lang: python
prefix: err
title: Log a stable failure event without exporting the exception
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, exception, traceback, handler, boundary]
  files: ["**/*.py"]
  symbols: [logging.exception, exc_info]
related: [shared-obs-allowlisted-diagnostics, python-err-reraise-bare, python-err-warnings-vs-errors]
sources:
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: logging - Logger objects, exception()
    url: https://docs.python.org/3/library/logging.html
  - title: Python Tutorial - Handling Exceptions
    url: https://docs.python.org/3/tutorial/errors.html
---

> Emit a stable event and approved code when handling an exception; keep exception details out of diagnostic sinks by default.

## Why

`logger.exception` and `exc_info` attach exception messages and tracebacks, which can contain credentials or personal data; formatting the exception as text has the same disclosure risk. Use a stable event and bounded code, and preserve the exception internally when propagation is required. Apply the same exclusion policy at outer handlers and test the actual log sink, because re-raising is not permission to serialize the exception later.

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
        logger.error("sync.failed", extra={"error_code": "IO_FAILURE"})
        raise
```

## See Also

- [python-err-reraise-bare](err-reraise-bare.md) - propagating after the log entry is written
- [python-err-warnings-vs-errors](err-warnings-vs-errors.md) - routing warnings into the same logging pipeline
