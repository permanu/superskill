---
id: python-async-await-coroutines
lang: python
prefix: async
title: Await or schedule every coroutine because calling a coroutine function starts nothing
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [await, coroutine, create_task, RuntimeWarning]
  files: ["**/*.py"]
  symbols: [await, create_task]
related: [python-async-task-strong-ref]
sources:
  - title: asyncio - Coroutines
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Await or schedule every coroutine; calling a coroutine function starts nothing.

## Why

Calling a coroutine function only builds the coroutine object; without `await` or a task it never runs, and the interpreter warns only when the object is collected. Silent non-execution is the failure mode: the call site looks like work was requested, but no code ran. Every call site needs `await` or `create_task`.

## Bad

```python
import asyncio


async def write_audit() -> None:
    await asyncio.sleep(0)


async def main() -> None:
    write_audit()
```

## Good

```python
import asyncio


async def write_audit() -> None:
    await asyncio.sleep(0)


async def main() -> None:
    await write_audit()
```

## See Also

- [python-async-task-strong-ref](async-task-strong-ref.md) - when the coroutine is scheduled instead of awaited
