---
id: python-async-wait-first
lang: python
prefix: async
title: Return as soon as one task finishes with wait(FIRST_COMPLETED)
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wait, FIRST_COMPLETED, race, cancel]
  files: ["**/*.py"]
  symbols: [asyncio.wait, asyncio.FIRST_COMPLETED]
related: [python-async-gather-inspect, python-async-shield-selectively]
sources:
  - title: asyncio - Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Race tasks with wait(FIRST_COMPLETED) and cancel the losers; the default waits for all.

## Why

The asyncio task docs state that wait() blocks until the condition given by return_when and returns (done, pending) sets, and that FIRST_COMPLETED returns when any future finishes or is cancelled. The default condition is ALL_COMPLETED, so a race written with a bare wait() or gather() waits for every loser. Cancelling the pending tasks after the first result releases their resources.

## Bad

```python
import asyncio


async def fetch(url: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return url


async def main() -> None:
    tasks = [asyncio.create_task(fetch("a", 1)), asyncio.create_task(fetch("b", 5))]
    done, pending = await asyncio.wait(tasks)
    print([task.result() for task in done])
```

## Good

```python
import asyncio


async def fetch(url: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return url


async def main() -> None:
    tasks = [asyncio.create_task(fetch("a", 1)), asyncio.create_task(fetch("b", 5))]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    print([task.result() for task in done])
```

## See Also

- [python-async-gather-inspect](async-gather-inspect.md) - the gather counterpart for all-of results
- [python-async-shield-selectively](async-shield-selectively.md) - deciding what survives cancellation
