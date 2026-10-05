---
id: python-async-offload-blocking
lang: python
prefix: async
title: Offload blocking I/O with asyncio.to_thread instead of calling it in the coroutine
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [to_thread, blocking, file io, offload]
  files: ["**/*.py"]
  symbols: [asyncio.to_thread]
related: [python-async-offload-cpu]
sources:
  - title: asyncio - Running in threads
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Offload blocking I/O with asyncio.to_thread so the event loop keeps running other tasks.

## Why

A blocking call stops the single-threaded event loop for its full duration, delaying every other task. `asyncio.to_thread` runs the callable in a worker thread and propagates context variables into it. The GIL still applies, so this is for I/O-bound work; CPU-bound work belongs in processes or interpreters.

## Bad

```python
from pathlib import Path


async def read_all(paths: list[Path]) -> list[str]:
    return [path.read_text(encoding="utf-8") for path in paths]
```

## Good

```python
import asyncio
from pathlib import Path


def read_one(path: Path) -> str:
    return path.read_text(encoding="utf-8")


async def read_all(paths: list[Path]) -> list[str]:
    return await asyncio.gather(*(asyncio.to_thread(read_one, path) for path in paths))
```

## See Also

- [python-async-offload-cpu](async-offload-cpu.md) - where threads stop helping because of the GIL
