---
id: python-async-offload-cpu
lang: python
prefix: async
title: Send CPU-bound work to process or interpreter pools because threads serialize on the GIL
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cpu-bound, ProcessPoolExecutor, GIL, interpreter pool]
  files: ["**/*.py"]
  symbols: [ProcessPoolExecutor, run_in_executor]
related: [python-async-offload-blocking]
sources:
  - title: asyncio - Running in threads
    url: https://docs.python.org/3/library/asyncio-task.html
  - title: concurrent.futures - ProcessPoolExecutor
    url: https://docs.python.org/3/library/concurrent.futures.html
---

> Send CPU-bound work to process or interpreter pools; threads still serialize on the GIL.

## Why

`to_thread` releases the loop but not the GIL, so CPU-bound functions still serialize with the loop thread and starve tasks. Process pools and interpreter pools provide real parallelism; the tradeoff is pickling for processes and isolated state for interpreters. Choose the pool by whether the result can cross that boundary.

## Bad

```python
import asyncio


def hash_rounds(data: bytes) -> bytes:
    for _ in range(1000):
        data = bytes(reversed(data))
    return data


async def main() -> bytes:
    return await asyncio.to_thread(hash_rounds, b"payload")
```

## Good

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor


def hash_rounds(data: bytes) -> bytes:
    for _ in range(1000):
        data = bytes(reversed(data))
    return data


async def main() -> bytes:
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as pool:
        return await loop.run_in_executor(pool, hash_rounds, b"payload")
```

## See Also

- [python-async-offload-blocking](async-offload-blocking.md) - the I/O-bound case that threads handle well
