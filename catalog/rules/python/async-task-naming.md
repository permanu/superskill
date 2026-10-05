---
id: python-async-task-naming
lang: python
prefix: async
title: Name every long-lived task so introspection tools can identify it
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task name, introspection, debugging, traces]
  files: ["**/*.py"]
  symbols: [create_task, name]
related: [python-async-task-strong-ref]
sources:
  - title: asyncio - Creating tasks
    url: https://docs.python.org/3/library/asyncio-task.html
  - title: What's New in Python - Asyncio introspection capabilities
    url: https://docs.python.org/3/whatsnew/3.14.html
---

> Name every long-lived task; anonymous tasks are unidentifiable in traces.

## Why

Task names appear in asyncio introspection output and debug traces, so an incident shows which logical job is stuck instead of a generated task number. `create_task` and `TaskGroup.create_task` both accept a name. Naming costs nothing and makes long-running programs diagnosable.

## Bad

```python
import asyncio


async def poll_feed(url: str) -> None:
    await asyncio.sleep(0)


async def main() -> None:
    task = asyncio.create_task(poll_feed("https://example.com/feed"))
    await task
```

## Good

```python
import asyncio


async def poll_feed(url: str) -> None:
    await asyncio.sleep(0)


async def main() -> None:
    task = asyncio.create_task(poll_feed("https://example.com/feed"), name="poll_feed")
    await task
```

## See Also

- [python-async-task-strong-ref](async-task-strong-ref.md) - the other half of owning a background task
