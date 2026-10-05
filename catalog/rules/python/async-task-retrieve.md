---
id: python-async-task-retrieve
lang: python
prefix: async
title: Retrieve every task result or exception before discarding the task
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task exception, retrieve, await, done callback]
  files: ["**/*.py"]
  symbols: [Task.result, Task.exception]
related: [python-async-taskgroup-structured]
sources:
  - title: asyncio - Creating tasks
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Retrieve task results and exceptions; abandoned failures are logged only at collection.

## Why

A task whose exception is never retrieved logs "Task exception was never retrieved" when it is garbage collected, stripped of the context the failure had. Awaiting the task, gathering it, or reading the result in a done callback keeps the failure visible. TaskGroup retrieves every child's exception for you.

## Bad

```python
import asyncio


async def flush() -> None:
    raise OSError("disk full")


async def main() -> None:
    task = asyncio.create_task(flush())
    await asyncio.sleep(0)
    del task
```

## Good

```python
import asyncio


async def flush() -> None:
    raise OSError("disk full")


async def main() -> None:
    task = asyncio.create_task(flush())
    try:
        await task
    except OSError as exc:
        print(f"flush failed: {exc}")
```

## See Also

- [python-async-taskgroup-structured](async-taskgroup-structured.md) - grouping tasks so retrieval is automatic
