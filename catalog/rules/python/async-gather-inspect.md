---
id: python-async-gather-inspect
lang: python
prefix: async
title: Inspect every element when gathering with return_exceptions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [gather, return_exceptions, BaseExceptionGroup, batch]
  files: ["**/*.py"]
  symbols: [asyncio.gather, return_exceptions]
related: [python-async-taskgroup-structured, python-err-exception-group]
sources:
  - title: asyncio - Running tasks concurrently
    url: https://docs.python.org/3/library/asyncio-task.html
  - title: asyncio - Task groups
    url: https://docs.python.org/3/library/asyncio-task.html
---

> With gather(return_exceptions=True), inspect every result before treating the batch as done.

## Why

`gather(return_exceptions=True)` returns exceptions as ordinary list elements, so an unchecked batch silently contains failures and callers proceed with missing results. Cancelled children surface as `CancelledError`, which is a `BaseException`, so the aggregate must be a `BaseExceptionGroup`; its constructor returns an `ExceptionGroup` automatically when every contained exception is an `Exception`. gather also does not cancel siblings when one fails, unlike a TaskGroup.

## Bad

```python
import asyncio


async def job(name: str) -> str:
    if name == "b":
        raise OSError("failed")
    return name


async def main() -> None:
    results = await asyncio.gather(*(job(name) for name in ("a", "b")), return_exceptions=True)
    print(len(results))
```

## Good

```python
import asyncio


async def job(name: str) -> str:
    if name == "b":
        raise OSError("failed")
    return name


async def main() -> None:
    results = await asyncio.gather(*(job(name) for name in ("a", "b")), return_exceptions=True)
    failures = [result for result in results if isinstance(result, BaseException)]
    if failures:
        raise BaseExceptionGroup("jobs failed", failures)
    print(results)
```

## See Also

- [python-async-taskgroup-structured](async-taskgroup-structured.md) - the alternative that cancels siblings and aggregates failures
- [python-err-exception-group](err-exception-group.md) - handling the aggregated failures with except*
