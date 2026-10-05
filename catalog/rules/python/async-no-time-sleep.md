---
id: python-async-no-time-sleep
lang: python
prefix: async
title: Never call time.sleep in a coroutine; await asyncio.sleep instead
severity: must
enforce: tool
tool: ruff:ASYNC251
baseline: latest
status: verified
triggers:
  keywords: [time.sleep, asyncio.sleep, blocking, delay]
  files: ["**/*.py"]
  symbols: [time.sleep, asyncio.sleep]
related: [python-async-offload-blocking]
sources:
  - title: Ruff ASYNC251 - blocking-sleep-in-async-function
    url: https://docs.astral.sh/ruff/rules/blocking-sleep-in-async-function/
  - title: asyncio - Sleeping
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Never call time.sleep in a coroutine; await asyncio.sleep so other tasks run.

## Why

`time.sleep` blocks the event loop thread for the whole delay, so no other task progresses and the program appears hung. `asyncio.sleep` suspends only the current task and lets the loop schedule everything else. Ruff flags the blocking call by default in async functions.

## Bad

```python
import time


async def backoff(attempt: int) -> None:
    time.sleep(2**attempt)
```

## Good

```python
import asyncio


async def backoff(attempt: int) -> None:
    await asyncio.sleep(2**attempt)
```

## See Also

- [python-async-offload-blocking](async-offload-blocking.md) - the same principle for calls that have no async equivalent
