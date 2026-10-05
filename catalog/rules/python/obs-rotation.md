---
id: python-obs-rotation
lang: python
prefix: obs
title: Bound file logs with a rotating handler instead of an unbounded FileHandler
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rotation, RotatingFileHandler, disk, logs]
  files: ["**/*.py"]
  symbols: [RotatingFileHandler]
related: [python-obs-dictconfig]
sources:
  - title: logging.handlers - RotatingFileHandler
    url: https://docs.python.org/3/library/logging.handlers.html
  - title: Logging Cookbook - Using file rotation
    url: https://docs.python.org/3/howto/logging-cookbook.html
---

> Bound file logs with a rotating handler; a plain file handler grows forever.

## Why

The handlers docs state that a `FileHandler` grows indefinitely by default, and that with `RotatingFileHandler` rollover never occurs if either `maxBytes` or `backupCount` is zero. A long-running service with an unbounded log eventually fills its disk and fails for reasons unrelated to its work. `TimedRotatingFileHandler` is the same decision keyed to a schedule instead of size.

## Bad

```python
import logging


def setup() -> None:
    logging.basicConfig(filename="app.log", level=logging.INFO)
```

## Good

```python
import logging
from logging.handlers import RotatingFileHandler


def setup() -> None:
    handler = RotatingFileHandler("app.log", maxBytes=5_000_000, backupCount=3)
    logging.getLogger().addHandler(handler)
    logging.getLogger().setLevel(logging.INFO)
```

## See Also

- [python-obs-dictconfig](obs-dictconfig.md) - declaring this handler in the application's configuration
