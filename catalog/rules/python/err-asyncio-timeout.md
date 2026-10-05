---
id: python-err-asyncio-timeout
lang: python
prefix: err
title: Bound awaited operations with asyncio.timeout and handle TimeoutError outside the block
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [asyncio, timeout, deadline, CancelledError]
  files: ["**/*.py"]
  symbols: [asyncio.timeout, TimeoutError]
related: [python-err-asyncio-cancel, python-err-retry-idempotent]
sources:
  - title: asyncio - Timeouts
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Bound awaited I/O with asyncio.timeout; catch TimeoutError outside the block.

## Why

`asyncio.timeout` cancels the current task when the deadline passes and converts that cancellation into `TimeoutError` at the block exit. Catching `TimeoutError` inside the block runs before the conversion, so the handler never sees it. The context manager also nests safely and can be rescheduled, which older deadline helpers cannot.

## Bad

```python
import asyncio


async def fetch() -> bytes:
    async with asyncio.timeout(5):
        try:
            await asyncio.sleep(10)
        except TimeoutError:
            return b""
    return b"payload"
```

## Good

```python
import asyncio


async def fetch() -> bytes:
    try:
        async with asyncio.timeout(5):
            await asyncio.sleep(10)
    except TimeoutError:
        return b""
    return b"payload"
```

## See Also

- [python-err-asyncio-cancel](err-asyncio-cancel.md) - why the deadline's internal cancellation must propagate
- [python-err-retry-idempotent](err-retry-idempotent.md) - retrying the bounded operation safely
