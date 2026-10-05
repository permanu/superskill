---
id: python-async-shield-selectively
lang: python
prefix: async
title: Shield only operations that must finish once started
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shield, cancellation, commit, shutdown]
  files: ["**/*.py"]
  symbols: [asyncio.shield]
related: [python-err-asyncio-cancel]
sources:
  - title: asyncio - Shielding from cancellation
    url: https://docs.python.org/3/library/asyncio-task.html
---

> Shield only operations that must complete; shielding hides cancellation from the caller.

## Why

`shield` protects the inner task from the caller's cancellation, but the caller still receives `CancelledError`, so it must wait for the shielded work to finish before exiting. That is right for commits and flushes that would corrupt state if interrupted. Wrapping ordinary work hides shutdown signals and delays exit for no benefit.

## Bad

```python
import asyncio


async def refresh() -> None:
    await asyncio.sleep(0)


async def main() -> None:
    await asyncio.shield(refresh())
```

## Good

```python
import asyncio


async def commit() -> None:
    await asyncio.sleep(0)


async def main() -> None:
    task = asyncio.create_task(commit())
    try:
        await asyncio.shield(task)
    except asyncio.CancelledError:
        await task
        raise
```

## See Also

- [python-err-asyncio-cancel](err-asyncio-cancel.md) - the cancellation contract the shield defers, not removes
