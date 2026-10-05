---
id: python-async-queue-join
lang: python
prefix: async
title: Wait for queue completion with join and task_done
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Queue, join, task_done, termination]
  files: ["**/*.py"]
  symbols: [asyncio.Queue.join, asyncio.Queue.task_done]
related: [python-async-queue-backpressure, python-async-taskgroup-structured]
sources:
  - title: asyncio - Queues
    url: https://docs.python.org/3/library/asyncio-queue.html
---

> Wait for queue completion with join and task_done; polling empty() exits before the last item.

## Why

The asyncio queue docs state that join() blocks until all items have been received and processed, with the unfinished count dropping each time a consumer calls task_done(), and their worker example loops on get() while main awaits join() and then cancels the workers. A consumer that stops when empty() reports true can exit between a producer's last put and its next one. join() plus task_done() tracks work rather than queue size.

## Bad

```python
import asyncio


async def consume(queue: asyncio.Queue) -> None:
    while not queue.empty():
        item = await queue.get()
        print(item)
```

## Good

```python
import asyncio


async def consume(queue: asyncio.Queue) -> None:
    while True:
        item = await queue.get()
        print(item)
        queue.task_done()


async def main() -> None:
    queue: asyncio.Queue = asyncio.Queue()
    worker = asyncio.create_task(consume(queue))
    for value in range(3):
        queue.put_nowait(value)
    await queue.join()
    worker.cancel()
```

## See Also

- [python-async-queue-backpressure](async-queue-backpressure.md) - sizing the queue so producers cannot outrun consumers
- [python-async-taskgroup-structured](async-taskgroup-structured.md) - grouping worker tasks so cancellation is clean
