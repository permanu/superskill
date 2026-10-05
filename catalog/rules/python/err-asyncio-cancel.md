---
id: python-err-asyncio-cancel
lang: python
prefix: err
title: Re-raise asyncio.CancelledError after cleanup instead of swallowing it
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncio, cancel, CancelledError, task, cleanup]
  files: ["**/*.py"]
  symbols: [asyncio.CancelledError, asyncio.Task]
related: [python-err-asyncio-timeout, python-err-exception-group]
sources:
  - title: asyncio - Exceptions, CancelledError
    url: https://docs.python.org/3/library/asyncio-exceptions.html
  - title: asyncio - Task cancellation
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Never swallow asyncio.CancelledError; run synchronous cleanup and re-raise.

## Why

`CancelledError` derives from `BaseException` so ordinary handlers do not intercept it, and asyncio builds task-group shutdown and timeouts on that cancellation. A coroutine that absorbs it keeps running work the caller believes it stopped and breaks the cancellation contract. Cleanup belongs in `finally` blocks, or in an `except` clause that re-raises once synchronous cleanup is done.

## Bad

```python
import asyncio


async def fetch() -> bytes:
    try:
        await asyncio.sleep(1)
        return b"payload"
    except asyncio.CancelledError:
        return b""
```

## Good

```python
import asyncio


def close_connection() -> None:
    pass


async def fetch() -> bytes:
    try:
        await asyncio.sleep(1)
        return b"payload"
    except asyncio.CancelledError:
        close_connection()
        raise
```

## See Also

- [python-err-asyncio-timeout](err-asyncio-timeout.md) - the deadline mechanism that relies on cancellation
- [python-err-exception-group](err-exception-group.md) - structured concurrency reporting multiple task failures
