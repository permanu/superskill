---
id: python-async-semaphore-bound
lang: python
prefix: async
title: Bound concurrent fan-out with an asyncio.Semaphore
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Semaphore, concurrency, gather, fan-out]
  files: ["**/*.py"]
  symbols: [asyncio.Semaphore]
related: [python-async-primitives, python-async-gather-inspect]
sources:
  - title: asyncio - Synchronization Primitives
    url: https://docs.python.org/3/library/asyncio-sync.html
---

> Bound concurrent work with asyncio.Semaphore; gather() starts every task at once.

## Why

The asyncio docs describe a semaphore as managing an internal counter that blocks acquire() at zero until some task calls release(), and their preferred usage is an async with statement around asyncio.Semaphore(10) while working with a shared resource. gather() schedules every awaitable immediately, so a large fan-out opens every connection at once. Wrapping the worker body in a semaphore keeps concurrency at the configured limit.

## Bad

```python
import asyncio


async def fetch(url: str) -> bytes:
    return url.encode()


async def main(urls: list[str]) -> None:
    await asyncio.gather(*(fetch(url) for url in urls))
```

## Good

```python
import asyncio


async def fetch(url: str) -> bytes:
    return url.encode()


async def main(urls: list[str]) -> None:
    limit = asyncio.Semaphore(10)

    async def bounded(url: str) -> bytes:
        async with limit:
            return await fetch(url)

    await asyncio.gather(*(bounded(url) for url in urls))
```

## See Also

- [python-async-primitives](async-primitives.md) - choosing asyncio primitives over threading ones
- [python-async-gather-inspect](async-gather-inspect.md) - checking results and exceptions from gather
