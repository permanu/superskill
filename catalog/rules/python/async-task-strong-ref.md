---
id: python-async-task-strong-ref
lang: python
prefix: async
title: Keep a strong reference to every background task because the loop only holds weak ones
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [background task, strong reference, garbage collection]
  files: ["**/*.py"]
  symbols: [create_task, add_done_callback]
related: [python-async-task-retrieve]
sources:
  - title: asyncio - Creating tasks
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Keep a strong reference to every background task; the loop only holds weak ones.

## Why

The event loop keeps weak references to tasks, so a fire-and-forget task with no other reference can be garbage collected mid-execution and stop silently. Holding tasks in a collection keeps them alive, and having each task remove itself on completion prevents the collection from leaking finished tasks. TaskGroup also keeps strong references.

## Bad

```python
import asyncio


async def record(entry: str) -> None:
    await asyncio.sleep(0)


async def main() -> None:
    asyncio.create_task(record("started"))
```

## Good

```python
import asyncio

background: set[asyncio.Task[None]] = set()


async def record(entry: str) -> None:
    await asyncio.sleep(0)


async def main() -> None:
    task = asyncio.create_task(record("started"))
    background.add(task)
    task.add_done_callback(background.discard)
```

## See Also

- [python-async-task-retrieve](async-task-retrieve.md) - keeping the task alive is only half the job
