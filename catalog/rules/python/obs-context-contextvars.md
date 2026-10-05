---
id: python-obs-context-contextvars
lang: python
prefix: obs
title: Carry request context in contextvars and inject it with a logging filter
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [contextvars, request id, filter, LoggerAdapter]
  files: ["**/*.py"]
  symbols: [ContextVar, logging.Filter]
related: [python-async-contextvars, python-obs-lazy-formatting]
sources:
  - title: Logging Cookbook - Use of contextvars
    url: https://docs.python.org/3/howto/logging-cookbook.html
  - title: Logging Cookbook - Using Filters to impart contextual information
    url: https://docs.python.org/3/howto/logging-cookbook.html
---

> Put request context in contextvars and inject it into records with a filter.

## Why

The cookbook recommends context-local storage over thread-locals for request attributes because it works for both threads and asyncio, and it shows a filter copying those values onto each `LogRecord` for the formatter to print. Passing a request id through every function signature pollutes call chains, and embedding it in the message prevents structured handling. The filter adds the field once, where records are created.

## Bad

```python
import logging

logger = logging.getLogger(__name__)

REQUEST_ID = ""


def handle(request_id: str) -> None:
    global REQUEST_ID
    REQUEST_ID = request_id
    logger.info("handling request")
```

## Good

```python
import logging
from contextvars import ContextVar

logger = logging.getLogger(__name__)
request_id: ContextVar[str] = ContextVar("request_id", default="-")


class RequestFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True


logger.addFilter(RequestFilter())


def handle(rid: str) -> None:
    request_id.set(rid)
    logger.info("handling request")
```

## See Also

- [python-async-contextvars](async-contextvars.md) - why contextvars beat globals for concurrent tasks
- [python-obs-lazy-formatting](obs-lazy-formatting.md) - keeping the message template separate from the data
