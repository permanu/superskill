---
id: python-obs-queue-handler
lang: python
prefix: obs
title: Move slow handlers off the logging thread with QueueHandler and QueueListener
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [QueueHandler, QueueListener, blocking, async]
  files: ["**/*.py"]
  symbols: [QueueHandler, QueueListener]
related: [python-obs-rotation]
sources:
  - title: Logging Cookbook - Dealing with handlers that block
    url: https://docs.python.org/3/howto/logging-cookbook.html
  - title: logging.handlers - QueueHandler and QueueListener
    url: https://docs.python.org/3/library/logging.handlers.html
---

> Move slow handlers off the logging thread with QueueHandler and QueueListener.

## Why

Network, email, and even file handlers can block the thread that logs, and the cookbook notes that logging from async code can stall the event loop because asyncio internals log too. The documented pattern is a `QueueHandler` that only enqueues, plus a `QueueListener` running the real handlers on its own thread. Logging then costs a queue put in the hot path, and slow delivery happens elsewhere.

## Bad

```python
import logging
from logging.handlers import SMTPHandler


def setup() -> None:
    handler = SMTPHandler("mail", "app@example.com", ["ops@example.com"], "error")
    logging.getLogger("app").addHandler(handler)
```

## Good

```python
import logging
import queue
from logging.handlers import QueueHandler, QueueListener, SMTPHandler


def setup() -> QueueListener:
    mail = SMTPHandler("mail", "app@example.com", ["ops@example.com"], "error")
    records: queue.Queue[logging.LogRecord] = queue.Queue()
    listener = QueueListener(records, mail)
    logging.getLogger("app").addHandler(QueueHandler(records))
    listener.start()
    return listener
```

## See Also

- [python-obs-rotation](obs-rotation.md) - a file handler worth moving onto the listener
