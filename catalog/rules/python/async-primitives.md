---
id: python-async-primitives
lang: python
prefix: async
title: Synchronize tasks with asyncio primitives instead of threading primitives
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Lock, Event, Semaphore, threading]
  files: ["**/*.py"]
  symbols: [asyncio.Lock, threading.Lock]
related: [python-async-queue-backpressure]
sources:
  - title: asyncio - Synchronization Primitives
    url: https://docs.python.org/3/library/asyncio-sync.html
---

> Synchronize tasks with asyncio.Lock and friends; threading primitives block the loop.

## Why

asyncio primitives suspend only the waiting task, which lets the loop run everything else, and they are documented as not thread-safe. `threading` locks block the event loop thread while waiting, so a contended lock stalls the whole program. The two families are not interchangeable and cannot be mixed for the same state.

## Bad

```python
import threading

lock = threading.Lock()
counter = 0


async def bump() -> None:
    global counter
    with lock:
        counter += 1
```

## Good

```python
import asyncio

lock = asyncio.Lock()
counter = 0


async def bump() -> None:
    global counter
    async with lock:
        counter += 1
```

## See Also

- [python-async-queue-backpressure](async-queue-backpressure.md) - the queue is the primitive for passing work between tasks
