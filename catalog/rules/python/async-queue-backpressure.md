---
id: python-async-queue-backpressure
lang: python
prefix: async
title: Give every producer/consumer queue a maxsize so producers cannot outrun consumers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Queue, maxsize, backpressure, producer, consumer]
  files: ["**/*.py"]
  symbols: [asyncio.Queue, maxsize]
related: [python-async-primitives]
sources:
  - title: asyncio - Queues
    url: https://docs.python.org/3/library/asyncio-queue.html
---

> Give every producer/consumer Queue a maxsize so producers cannot outrun consumers.

## Why

An unbounded queue absorbs an unbounded backlog, so a slow consumer turns into growing memory use until the process fails. With `maxsize` set, `put` waits for a free slot, which is the backpressure that keeps production tied to consumption. Size the bound from what the consumers can drain in a reasonable window.

## Bad

```python
import asyncio

queue: asyncio.Queue[bytes] = asyncio.Queue()


async def produce(chunks: list[bytes]) -> None:
    for chunk in chunks:
        await queue.put(chunk)
```

## Good

```python
import asyncio

queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=64)


async def produce(chunks: list[bytes]) -> None:
    for chunk in chunks:
        await queue.put(chunk)
```

## See Also

- [python-async-primitives](async-primitives.md) - the synchronization family the queue belongs to
